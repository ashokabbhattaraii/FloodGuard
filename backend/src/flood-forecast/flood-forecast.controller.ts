import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FloodForecastService } from './flood-forecast.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Flood Forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('flood-forecast')
export class FloodForecastController {
  constructor(private forecast: FloodForecastService) {}

  @Get('region/:id')
  @ApiOperation({ summary: 'Get flood forecast for a specific region' })
  async forecastForRegion(@Param('id') id: string) {
    return this.forecast.forecastForRegion(id);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get flood forecast for all regions' })
  async monitorAll() {
    return this.forecast.monitorAllRegions();
  }
}
