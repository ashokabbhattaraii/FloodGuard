import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
import { LoggerMiddleware } from './common/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}


