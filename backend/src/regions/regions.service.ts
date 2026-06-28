import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto, UpdateRegionDto, AssignVolunteerDto, CreateSensorDto, UpdateSensorDto } from './regions.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const regions = await this.prisma.region.findMany({
      include: {
        sensors: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
        alerts: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
        },
        volunteers: {
          where: { isActive: true },
          include: {
            region: { select: { name: true } },
          },
        },
        evacuationRoutes: {
          where: { isActive: true },
          orderBy: { shelterName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return regions.map(region => ({
      ...region,
      volunteerCount: region.volunteers.length,
      sensorCount: region.sensors.length,
      alertCount: region.alerts.length,
      shelterCount: region.evacuationRoutes.length,
    }));
  }

  async findOne(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: {
        sensors: {
          where: { isActive: true },
          orderBy: { lastUpdated: 'desc' },
        },
        alerts: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
        },
        volunteers: {
          where: { isActive: true },
        },
        evacuationRoutes: {
          where: { isActive: true },
        },
      },
    });

    if (!region) {
      throw new NotFoundException(`Region with ID ${id} not found`);
    }

    return {
      ...region,
      volunteerCount: region.volunteers.length,
      sensorCount: region.sensors.length,
      alertCount: region.alerts.length,
      shelterCount: region.evacuationRoutes.length,
    };
  }

  async getStatus(id: string) {
    const region = await this.findOne(id);

    // Calculate risk level based on sensor readings
    const exceedingThreshold = region.sensors.filter(
      s => s.isActive && s.currentValue >= s.threshold
    );

    const calculatedRisk = this.calculateRiskLevel(
      exceedingThreshold.length,
      region.sensors.length
    );

    return {
      ...region,
      calculatedRisk,
      sensorsAboveThreshold: exceedingThreshold.length,
      sensorStatus: region.sensors.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        currentValue: s.currentValue,
        threshold: s.threshold,
        unit: s.unit,
        status: s.currentValue >= s.threshold ? 'critical' :
                s.currentValue >= s.threshold * 0.8 ? 'warning' : 'normal',
        latitude: s.latitude,
        longitude: s.longitude,
      })),
    };
  }

  private calculateRiskLevel(exceedingCount: number, totalSensors: number): string {
    if (totalSensors === 0) return 'low';
    const percentage = (exceedingCount / totalSensors) * 100;

    if (percentage >= 75) return 'critical';
    if (percentage >= 50) return 'high';
    if (percentage >= 25) return 'medium';
    return 'low';
  }

  async create(dto: CreateRegionDto) {
    return this.prisma.region.create({
      data: dto,
      include: {
        sensors: true,
        alerts: { where: { status: 'active' } },
        volunteers: true,
        evacuationRoutes: true,
      },
    });
  }

  async update(id: string, dto: UpdateRegionDto) {
    await this.findOne(id); // Check if exists

    return this.prisma.region.update({
      where: { id },
      data: dto,
      include: {
        sensors: true,
        alerts: { where: { status: 'active' } },
        volunteers: true,
        evacuationRoutes: true,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.region.delete({ where: { id } });
  }

  // Volunteer Management
  async assignVolunteer(regionId: string, dto: AssignVolunteerDto) {
    await this.findOne(regionId);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'volunteer' && user.role !== 'admin') {
      throw new BadRequestException('User must have volunteer or admin role');
    }

    // Check if already assigned
    const existing = await this.prisma.regionVolunteer.findUnique({
      where: {
        regionId_userId: {
          regionId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Volunteer already assigned to this region');
      }
      // Reactivate if previously deactivated
      return this.prisma.regionVolunteer.update({
        where: { id: existing.id },
        data: { isActive: true, assignedAt: new Date() },
      });
    }

    return this.prisma.regionVolunteer.create({
      data: {
        regionId,
        userId: dto.userId,
      },
    });
  }

  async removeVolunteer(regionId: string, userId: string) {
    const assignment = await this.prisma.regionVolunteer.findUnique({
      where: {
        regionId_userId: { regionId, userId },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Volunteer assignment not found');
    }

    return this.prisma.regionVolunteer.update({
      where: { id: assignment.id },
      data: { isActive: false },
    });
  }

  async getVolunteers(regionId: string) {
    await this.findOne(regionId);

    return this.prisma.regionVolunteer.findMany({
      where: { regionId, isActive: true },
      include: {
        region: { select: { name: true } },
      },
    });
  }

  // Sensor Management
  async createSensor(regionId: string, dto: CreateSensorDto) {
    await this.findOne(regionId);

    return this.prisma.sensor.create({
      data: {
        ...dto,
        regionId,
        unit: dto.unit || 'm',
      },
    });
  }

  async updateSensor(regionId: string, sensorId: string, dto: UpdateSensorDto) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor || sensor.regionId !== regionId) {
      throw new NotFoundException('Sensor not found in this region');
    }

    return this.prisma.sensor.update({
      where: { id: sensorId },
      data: dto,
    });
  }

  async deleteSensor(regionId: string, sensorId: string) {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id: sensorId },
    });

    if (!sensor || sensor.regionId !== regionId) {
      throw new NotFoundException('Sensor not found in this region');
    }

    return this.prisma.sensor.delete({ where: { id: sensorId } });
  }

  async getSensors(regionId: string) {
    await this.findOne(regionId);

    return this.prisma.sensor.findMany({
      where: { regionId },
      orderBy: { lastUpdated: 'desc' },
    });
  }
}
