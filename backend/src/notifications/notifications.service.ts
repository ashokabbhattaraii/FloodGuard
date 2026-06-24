import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationType =
  | 'alert'
  | 'request'
  | 'report'
  | 'shelter'
  | 'system';

export interface NotificationPayload {
  type?: NotificationType;
  title: string;
  message: string;
  link?: string;
  severity?: string; // info | low | medium | high | critical | success
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /** Create a single notification for one user. Never throws. */
  async notify(userId: string, payload: NotificationPayload) {
    if (!userId) return null;
    try {
      return await this.prisma.notification.create({
        data: {
          userId,
          type: (payload.type ?? 'system') as never,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          severity: payload.severity ?? 'info',
        },
      });
    } catch {
      return null;
    }
  }

  /** Create the same notification for many users. */
  async notifyMany(userIds: string[], payload: NotificationPayload) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return { count: 0 };
    try {
      return await this.prisma.notification.createMany({
        data: unique.map((userId) => ({
          userId,
          type: (payload.type ?? 'system') as never,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          severity: payload.severity ?? 'info',
        })),
      });
    } catch {
      return { count: 0 };
    }
  }

  /** Notify every user of a given role (e.g. all admins). */
  async notifyRole(
    role: 'resident' | 'volunteer' | 'admin',
    payload: NotificationPayload,
  ) {
    const users = await this.prisma.user.findMany({
      where: { role: role as never },
      select: { id: true },
    });
    return this.notifyMany(
      users.map((u) => u.id),
      payload,
    );
  }

  /** Notify residents — optionally scoped to a region. */
  async notifyResidents(payload: NotificationPayload, regionId?: string | null) {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'resident' as never,
        ...(regionId ? { regionId } : {}),
      },
      select: { id: true },
    });
    return this.notifyMany(
      users.map((u) => u.id),
      payload,
    );
  }

  findForUser(userId: string, limit = 50) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async remove(id: string, userId: string) {
    await this.prisma.notification.deleteMany({ where: { id, userId } });
    return { success: true };
  }
}
