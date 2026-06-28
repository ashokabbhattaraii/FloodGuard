import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        regionId: true,
        isApproved: true,
        approvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get pending volunteers awaiting approval
  findPendingVolunteers() {
    return this.prisma.user.findMany({
      where: {
        role: 'volunteer',
        isApproved: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        regionId: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, email: true, name: true, role: true, regionId: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  // Approve volunteer
  async approveVolunteer(userId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'volunteer') {
      throw new NotFoundException('User is not a volunteer');
    }
    if (user.isApproved) {
      throw new NotFoundException('User is already approved');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isApproved: true,
        approvedAt: true,
      },
    });
  }

  // Reject/Remove volunteer application
  async rejectVolunteer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'volunteer') {
      throw new NotFoundException('User is not a volunteer');
    }

    // Delete the user if not approved yet
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true, message: 'Volunteer application rejected' };
  }
}
