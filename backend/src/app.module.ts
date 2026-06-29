import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AlertsModule } from './alerts/alerts.module';
import { ReportsModule } from './reports/reports.module';
import { RegionsModule } from './regions/regions.module';
import { WeatherModule } from './weather/weather.module';
import { FloodRequestsModule } from './flood-requests/flood-requests.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { EvacuationModule } from './evacuation/evacuation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UploadsModule } from './uploads/uploads.module';
import { FloodForecastModule } from './flood-forecast/flood-forecast.module';
import { PublicModule } from './public/public.module';
import { VolunteerHelpModule } from './volunteer-help/volunteer-help.module';
import { HealthController } from './health.controller';
import { LoggerMiddleware } from './common/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    AlertsModule,
    ReportsModule,
    RegionsModule,
    WeatherModule,
    FloodRequestsModule,
    GeocodingModule,
    AnalyticsModule,
    EvacuationModule,
    NotificationsModule,
    UploadsModule,
    FloodForecastModule,
    PublicModule,
    VolunteerHelpModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}


