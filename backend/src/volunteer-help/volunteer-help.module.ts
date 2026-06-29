import { Module } from '@nestjs/common';
import { VolunteerHelpController } from './volunteer-help.controller';
import { VolunteerHelpService } from './volunteer-help.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [VolunteerHelpController],
  providers: [VolunteerHelpService],
  exports: [VolunteerHelpService],
})
export class VolunteerHelpModule {}
