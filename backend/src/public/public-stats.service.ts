import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicStatsService {
  constructor(private prisma: PrismaService) {}

  async getPublicStats() {
    const now = Date.now();

    // Get counts in parallel
    const [
      totalRegions,
      alerts,
      totalReports,
      totalShelters,
      totalVolunteers,
      regions,
    ] = await Promise.all([
      this.prisma.region.count(),
      this.prisma.alert.findMany({
        where: { status: 'active' },
        include: { region: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.report.count(),
      this.prisma.evacuationRoute.count({ where: { isActive: true } }),
      this.prisma.user.count({
        where: {
          role: 'volunteer',
          isApproved: true,
        },
      }),
      this.prisma.region.findMany({
        select: { riskLevel: true },
      }),
    ]);

    const activeAlerts = alerts.length;
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical').length;

    // Calculate risk distribution
    const riskDistribution = regions.reduce(
      (acc, r) => {
        acc[r.riskLevel] = (acc[r.riskLevel] || 0) + 1;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>,
    );

    const regionsAtRisk = riskDistribution.critical + riskDistribution.high;

    // Format recent alerts for public view
    const recentAlerts = alerts.map((a) => ({
      id: a.id,
      title: a.title,
      severity: a.severity,
      regionName: a.region.name,
      createdAt: a.createdAt.toISOString(),
    }));

    // System metrics (mock for now - can be enhanced with actual monitoring)
    const systemUptime = 99.9;
    const avgResponseTime = 245; // ms

    const elapsed = Date.now() - now;
    console.log(`Public stats calculated in ${elapsed}ms`);

    return {
      totalRegions,
      activeAlerts,
      criticalAlerts,
      totalReports,
      totalShelters,
      totalVolunteers,
      systemUptime,
      avgResponseTime,
      regionsAtRisk,
      recentAlerts,
      riskDistribution,
      _timestamp: new Date().toISOString(),
      _responseTime: elapsed,
    };
  }
}
