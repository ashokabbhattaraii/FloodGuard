import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto } from './alerts.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'List active alerts (public)' })
  @ApiQuery({ name: 'regionId', required: false })
  findAll(@Query('regionId') regionId?: string) {
    return this.alertsService.findAll(regionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert detail' })
  findOne(@Param('id') id: string) {
    return this.alertsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create alert (admin only)' })
  create(
    @Body() dto: CreateAlertDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.alertsService.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update/resolve alert (admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateAlertDto) {
    return this.alertsService.update(id, dto);
  }
}
