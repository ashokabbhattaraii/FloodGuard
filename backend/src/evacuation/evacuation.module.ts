import { Module } from '@nestjs/common';
import { EvacuationService } from './evacuation.service';
import { EvacuationController } from './evacuation.controller';

@Module({
  controllers: [EvacuationController],
  providers: [EvacuationService],
  exports: [EvacuationService],
})
export class EvacuationModule {}
