import { Module } from '@nestjs/common';
import { FloodForecastService } from './flood-forecast.service';
import { FloodForecastController } from './flood-forecast.controller';
import { FloodMonitorScheduler } from './flood-monitor.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { WeatherModule } from '../weather/weather.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [PrismaModule, WeatherModule, NotificationsModule, AlertsModule],
  controllers: [FloodForecastController],
  providers: [FloodForecastService, FloodMonitorScheduler],
  exports: [FloodForecastService],
})
export class FloodForecastModule {}
