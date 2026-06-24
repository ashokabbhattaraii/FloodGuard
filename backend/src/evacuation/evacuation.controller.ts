import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EvacuationService } from './evacuation.service';
import { CreateEvacuationRouteDto, UpdateEvacuationRouteDto } from './evacuation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Evacuation Routes')
@Controller('evacuation-routes')
export class EvacuationController {
  constructor(private evacuationService: EvacuationService) {}

  @Get()
  @ApiOperation({ summary: 'List all evacuation routes and shelters' })
  findAll() {
    return this.evacuationService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific evacuation route/shelter' })
  findOne(@Param('id') id: string) {
    return this.evacuationService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new evacuation route/shelter (admin only)' })
  create(@Body() dto: CreateEvacuationRouteDto) {
    return this.evacuationService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an evacuation route/shelter (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateEvacuationRouteDto) {
    return this.evacuationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an evacuation route/shelter (admin only)' })
  remove(@Param('id') id: string) {
    return this.evacuationService.remove(id);
  }
}
