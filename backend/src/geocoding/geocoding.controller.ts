import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';

@ApiTags('Geocoding')
@Controller('geocoding')
export class GeocodingController {
  constructor(private geocodingService: GeocodingService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search locations by name (Nominatim/OpenStreetMap)',
  })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false })
  search(@Query('q') q: string, @Query('limit') limit?: string) {
    return this.geocodingService.search(q, limit ? parseInt(limit) : 5);
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode lat/lon to address (Nominatim)' })
  @ApiQuery({ name: 'lat', required: true })
  @ApiQuery({ name: 'lon', required: true })
  reverse(@Query('lat') lat: string, @Query('lon') lon: string) {
    return this.geocodingService.reverse(lat, lon);
  }
}
