import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FloodForecastService } from './flood-forecast.service';

@Injectable()
export class FloodMonitorScheduler {
  private readonly logger = new Logger(FloodMonitorScheduler.name);

  constructor(private forecast: FloodForecastService) {}

  /**
   * Run flood monitoring every 15 minutes
   * Checks all regions and auto-generates alerts if needed
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorFloodRisk() {
    this.logger.log('Starting automated flood risk monitoring...');

    try {
      const predictions = await this.forecast.monitorAllRegions();

      const critical = predictions.filter(p => p.riskLevel === 'critical').length;
      const high = predictions.filter(p => p.riskLevel === 'high').length;
      const medium = predictions.filter(p => p.riskLevel === 'medium').length;

      this.logger.log(
        `Monitoring complete: ${predictions.length} regions analyzed ` +
        `(Critical: ${critical}, High: ${high}, Medium: ${medium})`,
      );

      // Log any high-risk regions
      predictions
        .filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high')
        .forEach(p => {
          this.logger.warn(
            `${p.riskLevel.toUpperCase()} risk in ${p.regionName} ` +
            `(${p.confidence}% confidence) - ${p.predictedFloodTime || 'Timing unknown'}`,
          );
        });
    } catch (error) {
      this.logger.error('Flood monitoring failed:', error);
    }
  }

  /**
   * Daily summary report at 8 AM
   */
  @Cron('0 8 * * *')
  async dailySummary() {
    this.logger.log('Generating daily flood risk summary...');

    try {
      const predictions = await this.forecast.monitorAllRegions();
      const highRisk = predictions.filter(
        p => p.riskLevel === 'critical' || p.riskLevel === 'high',
      );

      if (highRisk.length > 0) {
        this.logger.warn(
          `Daily Summary: ${highRisk.length} region(s) at high/critical risk:`,
        );
        highRisk.forEach(p => {
          this.logger.warn(`  - ${p.regionName}: ${p.riskLevel} (${p.confidence}%)`);
        });
      } else {
        this.logger.log('Daily Summary: No high-risk regions detected');
      }
    } catch (error) {
      this.logger.error('Daily summary failed:', error);
    }
  }
}
