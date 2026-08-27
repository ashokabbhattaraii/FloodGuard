import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FloodForecastService } from './flood-forecast.service';

/**
 * In-process flood monitoring, retained but DISABLED BY DEFAULT.
 *
 * Task #2 moved this trigger to EventBridge Scheduler -> fg-weather-ingest.
 * Two reasons it had to move rather than merely being duplicated:
 *
 *  1. @nestjs/schedule runs on EVERY instance in the Elastic Beanstalk fleet.
 *     As soon as autoscaling adds a second box, every flood alert fires twice.
 *     EventBridge fires exactly once no matter how many instances are running.
 *  2. Running both the cron and the Lambda at once produces duplicate alerts
 *     immediately, which is why this is opt-in via FLOOD_MONITOR_ENABLED.
 *
 * Set FLOOD_MONITOR_ENABLED=true ONLY to fall back if the serverless pipeline
 * is unavailable — and disable the EventBridge schedule first.
 */
@Injectable()
export class FloodMonitorScheduler implements OnModuleInit {
  private readonly logger = new Logger(FloodMonitorScheduler.name);
  private enabled = false;

  constructor(
    private forecast: FloodForecastService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    this.enabled = this.config.get<string>('FLOOD_MONITOR_ENABLED') === 'true';
    this.logger.log(
      this.enabled
        ? 'in-process flood monitoring ENABLED — ensure the EventBridge schedule is disabled'
        : 'in-process flood monitoring disabled (owned by EventBridge -> fg-weather-ingest)',
    );
  }

  /**
   * Run flood monitoring every 15 minutes
   * Checks all regions and auto-generates alerts if needed
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async monitorFloodRisk() {
    if (!this.enabled) return;
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
    if (!this.enabled) return;
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
