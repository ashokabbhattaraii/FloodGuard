/**
 * fg-alert-dispatch — SQS consumer on fg-alert-dispatch
 *
 * The fan-out stage. Persists the alert through the monolith (which also creates
 * the per-resident Notification rows via AlertsService), then publishes to SNS so
 * subscribers get it out-of-band.
 *
 * Message attributes are set on the SNS publish so subscribers can filter by
 * severity or region without a second topic per combination.
 */
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { internalFetch, logJson, requireEnv } from './common.mjs';

const sns = new SNSClient({});

const SEVERITY_COPY = {
  critical: 'CRITICAL FLOOD ALERT — evacuate now if instructed',
  high: 'HIGH FLOOD RISK — prepare to evacuate',
  medium: 'FLOOD WATCH — monitor conditions',
  low: 'Flood advisory',
};

async function processOne(body) {
  const alert = JSON.parse(body);
  const headline = SEVERITY_COPY[alert.riskLevel] ?? SEVERITY_COPY.low;
  const title = `${headline}: ${alert.regionName}`;
  const message =
    `${headline}\n\n` +
    `Region: ${alert.regionName}\n` +
    `Risk level: ${alert.riskLevel} (score ${alert.score}/100, confidence ${alert.confidence}%)\n` +
    `Forecast rainfall: ${alert.rainfall24h} mm in 24h, ${alert.rainfall48h} mm in 48h\n` +
    `Detected: ${alert.detectedAt}\n\n` +
    `Follow local authority guidance. Do not attempt to cross flowing water.`;

  // Idempotency key: if SQS redelivers, the monolith can reject the duplicate
  // rather than creating a second alert for the same region and window.
  const dedupeKey = `${alert.regionId}:${alert.detectedAt}`;

  const created = await internalFetch('/api/internal/alerts', {
    method: 'POST',
    body: {
      regionId: alert.regionId,
      severity: alert.riskLevel,
      title,
      message,
      dedupeKey,
      source: 'fg-alert-dispatch',
    },
  });

  if (created?.duplicate) {
    logJson('info', 'duplicate suppressed', { dedupeKey });
    return { duplicate: true };
  }

  await sns.send(new PublishCommand({
    TopicArn: requireEnv('ALERTS_TOPIC_ARN'),
    Subject: title.slice(0, 100),           // SNS subject hard limit
    Message: message,
    MessageAttributes: {
      severity: { DataType: 'String', StringValue: alert.riskLevel },
      regionId: { DataType: 'String', StringValue: alert.regionId },
    },
  }));

  logJson('info', 'alert dispatched', {
    region: alert.regionName, severity: alert.riskLevel, alertId: created?.id,
  });
  return { dispatched: true };
}

export const handler = async (event) => {
  const batchItemFailures = [];
  for (const record of event.Records) {
    try {
      await processOne(record.body);
    } catch (err) {
      logJson('error', 'dispatch failed', {
        messageId: record.messageId, error: String(err?.message ?? err),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
};
