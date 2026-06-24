import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './regions.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Regions')
@Controller('regions')
export class RegionsController {
  constructor(private regionsService: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all monitored regions' })
  findAll() {
    return this.regionsService.findAll();
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get region risk status + sensor data' })
  getStatus(@Param('id') id: string) {
    return this.regionsService.getStatus(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new region (admin only)' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }
}
