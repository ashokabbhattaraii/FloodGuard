import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAlertDto, UpdateAlertDto } from './alerts.dto';

@Injectable()
export class AlertsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  findAll(regionId?: string) {
    return this.prisma.alert.findMany({
      where: { status: 'active', ...(regionId && { regionId }) },
      orderBy: { createdAt: 'desc' },
      include: { region: { select: { name: true, riskLevel: true } } },
    });
  }

  async findOne(id: string) {
    const alert = await this.prisma.alert.findUnique({
      where: { id },
      include: { region: true },
    });
    if (!alert) throw new NotFoundException('Alert not found');
    return alert;
  }

  async create(dto: CreateAlertDto, userId: string) {
    const alert = await this.prisma.alert.create({
      data: { ...dto, issuedBy: userId },
    });
    // Broadcast to residents in the affected region (or all residents if none).
    await this.notifications.notifyResidents(
      {
        type: 'alert',
        title: `${alert.severity.toUpperCase()} flood alert`,
        message: alert.title,
        link: '/dashboard/resident/alerts',
        severity: alert.severity,
      },
      alert.regionId,
    );
    return alert;
  }

  async update(id: string, dto: UpdateAlertDto) {
    await this.findOne(id);
    return this.prisma.alert.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.status === 'resolved' && { resolvedAt: new Date() }),
      },
    });
  }
}
