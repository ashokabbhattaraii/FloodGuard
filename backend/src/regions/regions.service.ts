import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegionDto } from './regions.dto';

@Injectable()
export class RegionsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.region.findMany({
      include: {
        sensors: true,
        alerts: { where: { status: 'active' } },
      },
    });
  }

  async getStatus(id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      include: { sensors: true },
    });
    if (!region) throw new NotFoundException('Region not found');
    return region;
  }

  create(dto: CreateRegionDto) {
    return this.prisma.region.create({ data: dto });
  }
}
