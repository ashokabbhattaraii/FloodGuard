import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriodDto, AnalyticsRangeDto, TopRegionsQueryDto } from './analytics.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get KPI metrics for dashboard cards' })
  getKpis(@Query() dto: AnalyticsPeriodDto) {
    return this.service.kpis(dto.period);
  }

  @Get('alerts-by-day')
  @ApiOperation({ summary: 'Get count of alerts grouped by day and severity' })
  getAlertsByDay(@Query() dto: AnalyticsRangeDto) {
    return this.service.alertsByDay(dto.period, dto.regionId);
  }

  @Get('severity-breakdown')
  @ApiOperation({ summary: 'Get alert severity distribution percentages' })
  getSeverityBreakdown(@Query() dto: AnalyticsRangeDto) {
    return this.service.severityBreakdown(dto.period, dto.regionId);
  }

  @Get('top-regions')
  @ApiOperation({ summary: 'Get regions with the highest alert frequency' })
  getTopRegions(@Query() dto: TopRegionsQueryDto) {
    return this.service.topRegions(dto.period, dto.limit ? Number(dto.limit) : undefined);
  }
}
