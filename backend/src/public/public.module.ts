import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicStatsService } from './public-stats.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PublicController],
  providers: [PublicStatsService],
})
export class PublicModule {}
