import { Module } from '@nestjs/common';
import { FloodRequestsController } from './flood-requests.controller';
import { FloodRequestsService } from './flood-requests.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [FloodRequestsController],
  providers: [FloodRequestsService],
})
export class FloodRequestsModule {}
