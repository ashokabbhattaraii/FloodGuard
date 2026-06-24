import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvacuationRouteDto, UpdateEvacuationRouteDto } from './evacuation.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EvacuationService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const routes = await this.prisma.evacuationRoute.findMany();
    const regions = await this.prisma.region.findMany();
    const regionMap = new Map(regions.map((r) => [r.id, r]));

    return routes.map((r) => {
      const region = regionMap.get(r.regionId);
      return {
        ...r,
        regionName: region?.name || 'Unknown Region',
        regionCoordinates: region?.coordinates ?? null,
      };
    });
  }

  async findOne(id: string) {
    const route = await this.prisma.evacuationRoute.findUnique({
      where: { id },
    });
    if (!route) throw new NotFoundException('Evacuation route/shelter not found');
    const region = await this.prisma.region.findUnique({ where: { id: route.regionId } });
    return {
      ...route,
      regionName: region?.name || 'Unknown Region',
      regionCoordinates: region?.coordinates ?? null,
    };
  }

  async create(dto: CreateEvacuationRouteDto) {
    return this.prisma.evacuationRoute.create({
      data: {
        regionId: dto.regionId,
        shelterName: dto.shelterName,
        capacity: dto.capacity,
        routeData: dto.routeData !== undefined ? (dto.routeData as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
  }

  async update(id: string, dto: UpdateEvacuationRouteDto) {
    const route = await this.prisma.evacuationRoute.findUnique({ where: { id } });
    if (!route) throw new NotFoundException('Evacuation route/shelter not found');
    return this.prisma.evacuationRoute.update({
      where: { id },
      data: {
        regionId: dto.regionId !== undefined ? dto.regionId : route.regionId,
        shelterName: dto.shelterName !== undefined ? dto.shelterName : route.shelterName,
        capacity: dto.capacity !== undefined ? dto.capacity : route.capacity,
        routeData: dto.routeData !== undefined ? (dto.routeData as Prisma.InputJsonValue) : (route.routeData as Prisma.InputJsonValue),
      },
    });
  }

  async remove(id: string) {
    const route = await this.prisma.evacuationRoute.findUnique({ where: { id } });
    if (!route) throw new NotFoundException('Evacuation route/shelter not found');
    return this.prisma.evacuationRoute.delete({ where: { id } });
  }
}
