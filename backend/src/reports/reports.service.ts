import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateReportDto, ReviewReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  private s3Bucket: string;
  private cloudfrontDomain: string;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private config: ConfigService,
    private uploads: UploadsService,
  ) {
    this.s3Bucket = this.config.get('S3_BUCKET', 'floodguard-uploads');
    this.cloudfrontDomain = this.config.get('CLOUDFRONT_DOMAIN', '');
  }

  private async transformPhotoUrl(photoUrl: string | null): Promise<string | null> {
    if (!photoUrl) return null;

    // If already a full URL, return as-is
    if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
      return photoUrl;
    }

    // Generate signed URL (more secure than public URLs)
    try {
      const { url } = await this.uploads.generateDownloadUrl(photoUrl);
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);

      // Fallback to constructing public URL
      if (this.cloudfrontDomain) {
        return `https://${this.cloudfrontDomain}/${photoUrl}`;
      }

      const region = this.config.get('AWS_REGION', 'us-east-1');
      return `https://${this.s3Bucket}.s3.${region}.amazonaws.com/${photoUrl}`;
    }
  }

  async findAll(regionId?: string, status?: string) {
    const reports = await this.prisma.report.findMany({
      where: {
        ...(regionId && { regionId }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    // Transform photoUrl for each report (generate signed URLs)
    return Promise.all(
      reports.map(async (report) => ({
        ...report,
        photoUrl: await this.transformPhotoUrl(report.photoUrl),
      }))
    );
  }

  async create(dto: CreateReportDto, userId: string) {
    const report = await this.prisma.report.create({ data: { ...dto, userId } });
    // Let admins know there's a new report to review.
    await this.notifications.notifyRole('admin', {
      type: 'report',
      title: 'New flood report submitted',
      message: report.description?.slice(0, 90) || 'A resident submitted a flood report.',
      link: '/dashboard/admin/reports',
      severity: 'info',
    });
    return report;
  }

  async review(id: string, dto: ReviewReportDto) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Report not found');
    const updated = await this.prisma.report.update({
      where: { id },
      data: { status: dto.status },
    });

    // Tell the resident who filed it.
    await this.notifications.notify(report.userId, {
      type: 'report',
      title: `Your flood report was ${dto.status}`,
      message: report.description?.slice(0, 90) || 'Your report has been reviewed.',
      link: '/dashboard/resident/reports',
      severity: dto.status === 'verified' ? 'success' : dto.status === 'rejected' ? 'medium' : 'info',
    });
    return updated;
  }
}
