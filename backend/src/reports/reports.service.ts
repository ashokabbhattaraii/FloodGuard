import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReportDto, ReviewReportDto } from './reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  findAll(regionId?: string, status?: string) {
    return this.prisma.report.findMany({
      where: {
        ...(regionId && { regionId }),
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
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
