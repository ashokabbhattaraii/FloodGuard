import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { WeatherService } from './weather.service';

@ApiTags('Weather')
@Controller('weather')
export class WeatherController {
  constructor(private weatherService: WeatherService) {}

  @Get()
  @ApiOperation({ summary: 'Get current weather (Open-Meteo)' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lon', required: false })
  getWeather(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string,
  ) {
    return this.weatherService.getCurrentWeather({ lat, lon, city });
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get 7-day forecast (Open-Meteo)' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lon', required: false })
  getForecast(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string,
  ) {
    return this.weatherService.getForecast({ lat, lon, city });
  }

  @Get('rainfall')
  @ApiOperation({ summary: 'Get 48h hourly rainfall forecast with flood risk assessment' })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lon', required: false })
  getHourlyRainfall(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('city') city?: string,
  ) {
    return this.weatherService.getHourlyRainfall({ lat, lon, city });
  }
}
