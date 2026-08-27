import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Service-to-service operations for the serverless tier.
 *
 * Why this exists: the Lambdas own DynamoDB and S3, but Postgres stays owned by
 * this monolith. Rather than giving six functions their own database
 * connections (which would force them into the VPC and require a NAT Gateway for
 * fg-weather-ingest's outbound Open-Meteo calls), they write through here.
 */
@Injectable()
export class InternalService {
  private readonly logger = new Logger(InternalService.name);

  /** Suppress a repeat alert for the same region+severity inside this window. */
  private static readonly DEDUPE_WINDOW_MINUTES = 30;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Everything fg-weather-ingest and fg-flood-forecast need to score a region,
   * in one round trip: coordinates for the weather lookup, plus the sensor and
   * geographic inputs the risk model consumes.
   */
  async listRegionsForForecast() {
    const regions = await this.prisma.region.findMany({
      where: { centerLat: { not: null }, centerLng: { not: null } },
      select: {
        id: true,
        name: true,
        centerLat: true,
        centerLng: true,
        riskLevel: true,
        population: true,
        area: true,
        sensors: {
          where: { isActive: true },
          select: { currentValue: true, threshold: true, type: true },
        },
      },
    });
    return regions.map((r) => ({ ...r, sensors: r.sensors ?? [] }));
  }

  async updateRegionRisk(
    regionId: string,
    body: { riskLevel: string; score?: number; confidence?: number; source?: string },
  ) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
      select: { id: true, name: true, riskLevel: true },
    });
    if (!region) throw new NotFoundException(`region ${regionId} not found`);

    // Skip the write when nothing changed: this runs every 10 minutes across all
    // regions, and an unconditional update would churn updatedAt on every row.
    if (region.riskLevel === body.riskLevel) {
      return { id: region.id, riskLevel: region.riskLevel, changed: false };
    }

    const updated = await this.prisma.region.update({
      where: { id: regionId },
      data: { riskLevel: body.riskLevel as never },
      select: { id: true, riskLevel: true },
    });
    this.logger.log(
      `${region.name}: ${region.riskLevel} -> ${body.riskLevel} ` +
        `(score ${body.score ?? '?'}, via ${body.source ?? 'internal'})`,
    );
    return { ...updated, changed: true, previous: region.riskLevel };
  }

  /**
   * Create an alert on behalf of fg-alert-dispatch.
   *
   * Returns { duplicate: true } instead of erroring when a matching alert is
   * already active. SQS guarantees at-least-once delivery, so a redelivered
   * message must not produce a second alert to every resident in the region.
   */
  async createAlert(body: {
    regionId: string;
    severity: string;
    title: string;
    message: string;
    dedupeKey?: string;
    source?: string;
  }) {
    const since = new Date(Date.now() - InternalService.DEDUPE_WINDOW_MINUTES * 60_000);
    const existing = await this.prisma.alert.findFirst({
      where: {
        regionId: body.regionId,
        severity: body.severity as never,
        status: 'active' as never,
        createdAt: { gte: since },
      },
      select: { id: true },
    });
    if (existing) {
      this.logger.log(`duplicate alert suppressed for region ${body.regionId}`);
      return { id: existing.id, duplicate: true };
    }

    const systemUserId = await this.systemUserId();
    const alert = await this.prisma.alert.create({
      data: {
        regionId: body.regionId,
        severity: body.severity as never,
        title: body.title,
        description: body.message,
        issuedBy: systemUserId,
      },
      select: { id: true, severity: true, title: true },
    });

    // Same in-app fan-out the human admin path performs (AlertsService.create).
    await this.notifications.notifyResidents(
      {
        type: 'alert',
        title: `${alert.severity.toUpperCase()} flood alert`,
        message: alert.title,
        link: '/dashboard/resident/alerts',
        severity: alert.severity,
      },
      body.regionId,
    );

    this.logger.log(`alert ${alert.id} created by ${body.source ?? 'internal'}`);
    return { id: alert.id, duplicate: false };
  }

  /** Public flood report arriving from fg-report-intake via API Gateway. */
  async createReport(body: {
    regionId: string;
    description: string;
    latitude: number;
    longitude: number;
    severity?: string;
    photoKey?: string;
    reporterName?: string;
  }) {
    const systemUserId = await this.systemUserId();
    const report = await this.prisma.report.create({
      data: {
        userId: systemUserId,
        regionId: body.regionId,
        description: body.reporterName
          ? `[public: ${body.reporterName}] ${body.description}`
          : `[public] ${body.description}`,
        latitude: body.latitude,
        longitude: body.longitude,
        photoUrl: body.photoKey ?? null,
      },
      select: { id: true, status: true },
    });

    // Admins triage public submissions, so tell them one arrived.
    await this.notifications.notifyRole('admin', {
      type: 'report',
      title: 'New public flood report',
      message: body.description.slice(0, 140),
      link: '/dashboard/admin/reports',
      severity: body.severity ?? 'info',
    });

    return report;
  }

  /**
   * fg-image-process verdict for an uploaded photo. A report whose photo failed
   * content sniffing has its photoUrl cleared so the admin UI never renders it.
   */
  async recordUploadVerification(body: {
    key: string;
    verdict: 'verified' | 'rejected';
    detectedType?: string | null;
    bytes?: number;
  }) {
    if (body.verdict === 'verified') {
      this.logger.log(`upload ${body.key} verified as ${body.detectedType}`);
      return { key: body.key, verdict: body.verdict, cleared: 0 };
    }

    const cleared = await this.prisma.report.updateMany({
      where: { photoUrl: body.key },
      data: { photoUrl: null },
    });
    this.logger.warn(
      `upload ${body.key} rejected (claimed image, detected ${body.detectedType ?? 'unknown'}) — ` +
        `cleared from ${cleared.count} report(s)`,
    );
    return { key: body.key, verdict: body.verdict, cleared: cleared.count };
  }

  /**
   * Reports and alerts both require a userId/issuedBy FK, but these records
   * originate from automation rather than a person. Resolve (and lazily create)
   * a dedicated system account instead of borrowing a real admin's identity.
   */
  private cachedSystemUserId: string | null = null;

  private async systemUserId(): Promise<string> {
    if (this.cachedSystemUserId) return this.cachedSystemUserId;

    const email = 'system@floodguard.np';
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      this.cachedSystemUserId = existing.id;
      return existing.id;
    }

    const created = await this.prisma.user.create({
      data: {
        email,
        name: 'FloodGuard Automation',
        // Not a bcrypt hash, so no password can ever validate against it —
        // this account exists only to satisfy foreign keys.
        password: 'SERVICE_ACCOUNT_NO_LOGIN',
        role: 'admin' as never,
        isApproved: false,
      },
      select: { id: true },
    });
    this.cachedSystemUserId = created.id;
    this.logger.log('created system automation account');
    return created.id;
  }
}
