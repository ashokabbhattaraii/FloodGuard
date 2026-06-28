import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { CreateRegionDto, UpdateRegionDto, AssignVolunteerDto, CreateSensorDto, UpdateSensorDto } from './regions.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get region details' })
  findOne(@Param('id') id: string) {
    return this.regionsService.findOne(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get region risk status + sensor data' })
  getStatus(@Param('id') id: string) {
    return this.regionsService.getStatus(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new region (admin only)' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update region details (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete region (super admin only)' })
  delete(@Param('id') id: string) {
    return this.regionsService.delete(id);
  }

  // Volunteer Management
  @Get(':id/volunteers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get volunteers assigned to region' })
  getVolunteers(@Param('id') id: string) {
    return this.regionsService.getVolunteers(id);
  }

  @Post(':id/volunteers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign volunteer to region (admin only)' })
  assignVolunteer(@Param('id') id: string, @Body() dto: AssignVolunteerDto) {
    return this.regionsService.assignVolunteer(id, dto);
  }

  @Delete(':id/volunteers/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove volunteer from region (admin only)' })
  removeVolunteer(@Param('id') id: string, @Param('userId') userId: string) {
    return this.regionsService.removeVolunteer(id, userId);
  }

  // Sensor Management
  @Get(':id/sensors')
  @ApiOperation({ summary: 'Get sensors in region' })
  getSensors(@Param('id') id: string) {
    return this.regionsService.getSensors(id);
  }

  @Post(':id/sensors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add sensor to region (admin only)' })
  createSensor(@Param('id') id: string, @Body() dto: CreateSensorDto) {
    return this.regionsService.createSensor(id, dto);
  }

  @Put(':id/sensors/:sensorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update sensor (admin only)' })
  updateSensor(
    @Param('id') id: string,
    @Param('sensorId') sensorId: string,
    @Body() dto: UpdateSensorDto
  ) {
    return this.regionsService.updateSensor(id, sensorId, dto);
  }

  @Delete(':id/sensors/:sensorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete sensor (admin only)' })
  deleteSensor(@Param('id') id: string, @Param('sensorId') sensorId: string) {
    return this.regionsService.deleteSensor(id, sensorId);
  }
}
