import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateFloodRequestDto,
  UpdateFloodRequestDto,
} from './flood-requests.dto';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  assigned: 'Assigned to a responder',
  in_progress: 'Responder en route',
  completed: 'Resolved',
  cancelled: 'Cancelled',
};

@Injectable()
export class FloodRequestsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  findAll(status?: string, type?: string, regionId?: string) {
    return this.prisma.floodRequest.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(regionId && { regionId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  findOne(id: string) {
    return this.prisma.floodRequest.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  async create(dto: CreateFloodRequestDto, userId: string) {
    const created = await this.prisma.floodRequest.create({
      data: { ...dto, userId },
    });
    // Alert all admins about the new SOS request.
    await this.notifications.notifyRole('admin', {
      type: 'request',
      title: `New ${created.priority} SOS request`,
      message: `${created.title} — ${created.location}`,
      link: '/dashboard/admin/requests',
      severity: created.priority,
    });
    // Alert all volunteers so they can claim it from the Open Requests board.
    await this.notifications.notifyRole('volunteer', {
      type: 'request',
      title: `New ${created.priority} SOS — help needed`,
      message: `${created.title} — ${created.location}`,
      link: '/dashboard/volunteer/requests',
      severity: created.priority,
    });
    return created;
  }

  async update(id: string, dto: UpdateFloodRequestDto) {
    const req = await this.prisma.floodRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    const updated = await this.prisma.floodRequest.update({
      where: { id },
      data: dto,
    });

    // Notify the requester whenever the status changes.
    if (dto.status && dto.status !== req.status) {
      await this.notifications.notify(req.userId, {
        type: 'request',
        title: 'Your SOS request was updated',
        message: `"${req.title}" is now: ${STATUS_LABEL[dto.status] ?? dto.status}`,
        link: '/dashboard/resident/requests',
        severity: dto.status === 'completed' ? 'success' : 'info',
      });
    }
    return updated;
  }

  myRequests(userId: string) {
    return this.prisma.floodRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** List only unclaimed / pending requests */
  findUnclaimed() {
    return this.prisma.floodRequest.findMany({
      where: { status: 'pending' },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { user: { select: { name: true, email: true } } },
    });
  }

  /** List requests assigned to a specific volunteer */
  assignedToMe(volunteerId: string) {
    return this.prisma.floodRequest.findMany({
      where: { assignedTo: volunteerId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });
  }

  /**
   * Atomic claim: only succeeds if the request is still PENDING.
   * Uses updateMany with a status condition to prevent double-claims.
   */
  async claimRequest(id: string, volunteerId: string) {
    const result = await this.prisma.floodRequest.updateMany({
      where: { id, status: 'pending' },
      data: { status: 'assigned', assignedTo: volunteerId },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'Request has already been claimed or does not exist',
      );
    }

    const claimed = await this.prisma.floodRequest.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    // Tell the resident a responder is on the way.
    if (claimed) {
      await this.notifications.notify(claimed.userId, {
        type: 'request',
        title: 'A volunteer is responding',
        message: `Your request "${claimed.title}" has been claimed by a responder.`,
        link: '/dashboard/resident/requests',
        severity: 'success',
      });
    }
    return claimed;
  }

  /** Admin assigns / reassigns a request to a volunteer */
  async assignRequest(id: string, volunteerId: string) {
    const req = await this.prisma.floodRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    const updated = await this.prisma.floodRequest.update({
      where: { id },
      data: { status: 'assigned', assignedTo: volunteerId },
    });

    // Notify the assigned volunteer and the requester.
    await this.notifications.notify(volunteerId, {
      type: 'request',
      title: 'New task assigned to you',
      message: `You've been dispatched to "${req.title}" — ${req.location}`,
      link: '/dashboard/volunteer',
      severity: req.priority,
    });
    await this.notifications.notify(req.userId, {
      type: 'request',
      title: 'A responder has been assigned',
      message: `Help is on the way for "${req.title}".`,
      link: '/dashboard/resident/requests',
      severity: 'success',
    });
    return updated;
  }

  /** Aggregate analytics for admin dashboard */
  async getAnalytics() {
    const [total, pending, assigned, inProgress, completed, cancelled] =
      await Promise.all([
        this.prisma.floodRequest.count(),
        this.prisma.floodRequest.count({ where: { status: 'pending' } }),
        this.prisma.floodRequest.count({ where: { status: 'assigned' } }),
        this.prisma.floodRequest.count({ where: { status: 'in_progress' } }),
        this.prisma.floodRequest.count({ where: { status: 'completed' } }),
        this.prisma.floodRequest.count({ where: { status: 'cancelled' } }),
      ]);

    // Compute average resolution time for completed requests
    const completedRequests = await this.prisma.floodRequest.findMany({
      where: { status: 'completed' },
      select: { createdAt: true, updatedAt: true },
    });
    const avgResolutionMs =
      completedRequests.length > 0
        ? completedRequests.reduce(
            (sum, r) =>
              sum +
              (new Date(r.updatedAt).getTime() -
                new Date(r.createdAt).getTime()),
            0,
          ) / completedRequests.length
        : 0;

    return {
      total,
      pending,
      assigned,
      inProgress,
      completed,
      cancelled,
      avgResolutionMinutes: Math.round(avgResolutionMs / 60000),
    };
  }
}
