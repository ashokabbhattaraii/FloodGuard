import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateHelpRequestDto, RespondToHelpRequestDto } from './volunteer-help.dto';

@Injectable()
export class VolunteerHelpService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /**
   * Find nearby volunteers based on the flood request location
   * Returns volunteers within a certain radius (simplified version)
   */
  async findNearbyVolunteers(floodRequestId: string, currentVolunteerId: string) {
    const floodRequest = await this.prisma.floodRequest.findUnique({
      where: { id: floodRequestId },
    });

    if (!floodRequest) {
      throw new NotFoundException('Flood request not found');
    }

    // Get all approved volunteers except the current one
    const volunteers = await this.prisma.user.findMany({
      where: {
        role: 'volunteer',
        isApproved: true,
        id: { not: currentVolunteerId },
        ...(floodRequest.regionId && { regionId: floodRequest.regionId }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        regionId: true,
      },
    });

    return volunteers;
  }

  /**
   * Create a help request from one volunteer to another
   */
  async createHelpRequest(dto: CreateHelpRequestDto, requestedBy: string) {
    // Validate flood request exists and is assigned to the requesting volunteer
    const floodRequest = await this.prisma.floodRequest.findUnique({
      where: { id: dto.floodRequestId },
      include: { user: { select: { name: true } } },
    });

    if (!floodRequest) {
      throw new NotFoundException('Flood request not found');
    }

    if (floodRequest.assignedTo !== requestedBy) {
      throw new BadRequestException('You can only request help for tasks assigned to you');
    }

    // Check if already requested help from this volunteer
    const existing = await this.prisma.volunteerHelpRequest.findFirst({
      where: {
        floodRequestId: dto.floodRequestId,
        requestedBy,
        requestedTo: dto.requestedTo,
        status: 'pending',
      },
    });

    if (existing) {
      throw new ConflictException('You already have a pending help request to this volunteer');
    }

    // Create the help request
    const helpRequest = await this.prisma.volunteerHelpRequest.create({
      data: {
        floodRequestId: dto.floodRequestId,
        requestedBy,
        requestedTo: dto.requestedTo,
        message: dto.message,
      },
    });

    // Get requester info
    const requester = await this.prisma.user.findUnique({
      where: { id: requestedBy },
      select: { name: true },
    });

    // Notify the volunteer being asked for help
    await this.notifications.notify(dto.requestedTo, {
      type: 'request',
      title: 'Help requested from fellow volunteer',
      message: `${requester?.name || 'A volunteer'} needs help with: ${floodRequest.title}`,
      link: '/dashboard/volunteer/help-requests',
      severity: floodRequest.priority,
    });

    return helpRequest;
  }

  /**
   * Get all help requests sent TO the current volunteer (inbox)
   */
  async getReceivedHelpRequests(volunteerId: string, status?: string) {
    return this.prisma.volunteerHelpRequest.findMany({
      where: {
        requestedTo: volunteerId,
        ...(status && { status: status as any }),
      },
      include: {
        floodRequest: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all help requests sent BY the current volunteer (outbox)
   */
  async getSentHelpRequests(volunteerId: string) {
    return this.prisma.volunteerHelpRequest.findMany({
      where: {
        requestedBy: volunteerId,
      },
      include: {
        floodRequest: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all help requests for a specific flood request
   */
  async getHelpRequestsForTask(floodRequestId: string, volunteerId: string) {
    // Verify the volunteer is assigned to this task
    const floodRequest = await this.prisma.floodRequest.findUnique({
      where: { id: floodRequestId },
    });

    if (!floodRequest) {
      throw new NotFoundException('Flood request not found');
    }

    if (floodRequest.assignedTo !== volunteerId) {
      throw new BadRequestException('You can only view help requests for your own tasks');
    }

    return this.prisma.volunteerHelpRequest.findMany({
      where: {
        floodRequestId,
        requestedBy: volunteerId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Respond to a help request (accept or reject)
   */
  async respondToHelpRequest(
    helpRequestId: string,
    dto: RespondToHelpRequestDto,
    volunteerId: string,
  ) {
    const helpRequest = await this.prisma.volunteerHelpRequest.findUnique({
      where: { id: helpRequestId },
      include: {
        floodRequest: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!helpRequest) {
      throw new NotFoundException('Help request not found');
    }

    if (helpRequest.requestedTo !== volunteerId) {
      throw new BadRequestException('You can only respond to help requests directed to you');
    }

    if (helpRequest.status !== 'pending') {
      throw new BadRequestException('This help request has already been responded to');
    }

    // Update the help request
    const updated = await this.prisma.volunteerHelpRequest.update({
      where: { id: helpRequestId },
      data: {
        status: dto.status,
        responseMessage: dto.responseMessage,
        respondedAt: new Date(),
      },
    });

    // Get responder info
    const responder = await this.prisma.user.findUnique({
      where: { id: volunteerId },
      select: { name: true },
    });

    // Notify the volunteer who requested help
    const notificationTitle = dto.status === 'accepted'
      ? '✅ Help accepted!'
      : '❌ Help request declined';

    const notificationMessage = dto.status === 'accepted'
      ? `${responder?.name || 'A volunteer'} has accepted your help request for "${helpRequest.floodRequest.title}"`
      : `${responder?.name || 'A volunteer'} declined your help request${dto.responseMessage ? `: ${dto.responseMessage}` : ''}`;

    await this.notifications.notify(helpRequest.requestedBy, {
      type: 'request',
      title: notificationTitle,
      message: notificationMessage,
      link: '/dashboard/volunteer',
      severity: dto.status === 'accepted' ? 'success' : 'info',
    });

    return updated;
  }

  /**
   * Get statistics for help requests
   */
  async getHelpRequestStats(volunteerId: string) {
    const [received, sent, acceptedByMe, acceptedForMe] = await Promise.all([
      this.prisma.volunteerHelpRequest.count({
        where: { requestedTo: volunteerId, status: 'pending' },
      }),
      this.prisma.volunteerHelpRequest.count({
        where: { requestedBy: volunteerId, status: 'pending' },
      }),
      this.prisma.volunteerHelpRequest.count({
        where: { requestedTo: volunteerId, status: 'accepted' },
      }),
      this.prisma.volunteerHelpRequest.count({
        where: { requestedBy: volunteerId, status: 'accepted' },
      }),
    ]);

    return {
      receivedPending: received,
      sentPending: sent,
      acceptedByMe,
      acceptedForMe,
    };
  }
}
