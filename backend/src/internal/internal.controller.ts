import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalService } from './internal.service';
import { InternalKeyGuard } from './internal-key.guard';
import {
  CreateInternalAlertDto,
  CreateInternalReportDto,
  UpdateRegionRiskDto,
  UploadVerificationDto,
} from './internal.dto';

/**
 * Service-to-service API consumed by the Task #2 Lambdas.
 *
 * Excluded from Swagger: it is not part of the public contract, and publishing
 * the shape of a shared-key-authenticated surface only helps an attacker.
 */
@ApiExcludeController()
@Controller('internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(private internal: InternalService) {}

  /** fg-weather-ingest: regions to snapshot, with scoring inputs attached. */
  @Get('regions')
  listRegions() {
    return this.internal.listRegionsForForecast();
  }

  /** fg-flood-forecast: persist a newly computed risk level. */
  @Post('regions/:id/risk')
  updateRisk(@Param('id') id: string, @Body() dto: UpdateRegionRiskDto) {
    return this.internal.updateRegionRisk(id, dto);
  }

  /** fg-alert-dispatch: create the alert and fan out in-app notifications. */
  @Post('alerts')
  createAlert(@Body() dto: CreateInternalAlertDto) {
    return this.internal.createAlert(dto);
  }

  /** fg-report-intake: public report submitted via API Gateway. */
  @Post('reports')
  createReport(@Body() dto: CreateInternalReportDto) {
    return this.internal.createReport(dto);
  }

  /** fg-image-process: content-sniffing verdict for an uploaded photo. */
  @Post('uploads/verified')
  uploadVerified(@Body() dto: UploadVerificationDto) {
    return this.internal.recordUploadVerification(dto);
  }
}
