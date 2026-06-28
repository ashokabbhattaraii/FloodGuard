import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PublicStatsService } from './public-stats.service';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private stats: PublicStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get public statistics (no auth required)' })
  async getPublicStats() {
    return this.stats.getPublicStats();
  }
}
