/**
 * fg-flood-forecast — SQS consumer on fg-forecast-jobs
 *
 * Ports the risk model from backend/src/flood-forecast/flood-forecast.service.ts
 * verbatim (weather 0-40 + sensors 0-40 + geographic 0-20; >=70 triggers an alert)
 * so serverless and monolith scoring cannot silently diverge.
 *
 * Uses partial batch failure reporting: only the messages that actually threw are
 * retried, instead of the whole batch. Without this, one poison message forces
 * redelivery of its nine healthy neighbours and eventually poisons the DLQ too.
 */
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { internalFetch, logJson, requireEnv } from './common.mjs';

const sqs = new SQSClient({});

/** weather component, 0-40 — flood-forecast.service.ts calculateWeatherScore */
function weatherScore({ next6h, next24h, total48h }) {
  let s = 0;
  if (next6h > 50) s += 20; else if (next6h > 30) s += 15;
  else if (next6h > 20) s += 10; else if (next6h > 10) s += 5;

  if (next24h > 100) s += 15; else if (next24h > 70) s += 10;
  else if (next24h > 40) s += 6; else if (next24h > 20) s += 3;

  if (total48h > 150) s += 5; else if (total48h > 100) s += 3;
  return Math.min(s, 40);
}

/** sensor component, 0-40 — calculateSensorScore over analyzeSensors output */
function analyzeSensors(sensors = []) {
  if (sensors.length === 0) return { avgLevel: 0, criticalCount: 0, trend: 'stable', maxLevel: 0 };
  const ratios = sensors.map((s) => (s.threshold ? s.currentValue / s.threshold : 0));
  const avgLevel = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return {
    avgLevel,
    criticalCount: sensors.filter((s) => s.currentValue >= s.threshold).length,
    trend: avgLevel > 0.8 ? 'rising' : avgLevel < 0.3 ? 'falling' : 'stable',
    maxLevel: Math.max(...sensors.map((s) => s.currentValue)),
  };
}

function sensorScore(a) {
  let s = 0;
  if (a.avgLevel > 0.9) s += 20; else if (a.avgLevel > 0.75) s += 15;
  else if (a.avgLevel > 0.6) s += 10; else if (a.avgLevel > 0.4) s += 5;
  if (a.criticalCount > 0) s += 10;
  if (a.trend === 'rising') s += 10;
  return Math.min(s, 40);
}

/** geographic component, 0-20 — calculateGeographicScore */
function geoScore(region) {
  let s = 0;
  if (region.population && region.area) {
    const density = region.population / region.area;
    if (density > 5000) s += 10; else if (density > 2000) s += 6; else if (density > 1000) s += 3;
  }
  if (region.riskLevel === 'critical' || region.riskLevel === 'high') s += 5;
  if (region.riskLevel === 'critical') s += 5;
  return Math.min(s, 20);
}

const scoreToRisk = (n) => (n >= 70 ? 'critical' : n >= 50 ? 'high' : n >= 30 ? 'medium' : 'low');

function confidence(sensorCount, weatherProb) {
  let c = 50;
  if (sensorCount >= 5) c += 25; else if (sensorCount >= 3) c += 15; else if (sensorCount >= 1) c += 10;
  if (weatherProb > 80) c += 20; else if (weatherProb > 60) c += 15;
  else if (weatherProb > 40) c += 10; else c += 5;
  return Math.min(c, 100);
}

async function processOne(body) {
  const { snapshot, region } = JSON.parse(body);
  const analysis = analyzeSensors(region.sensors);

  const w = weatherScore(snapshot.accumulation);
  const s = sensorScore(analysis);
  const g = geoScore(region);
  const total = w + s + g;
  const riskLevel = scoreToRisk(total);
  const conf = confidence(region.sensors?.length ?? 0, snapshot.maxProbability);
  const alertThresholdReached = total >= 70;

  // The monolith owns Postgres — persist through its internal API, never a
  // direct DB connection (see common.mjs internalFetch for the rationale).
  await internalFetch(`/api/internal/regions/${region.id}/risk`, {
    method: 'POST',
    body: { riskLevel, score: total, confidence: conf, source: 'fg-flood-forecast' },
  });

  if (alertThresholdReached) {
    await sqs.send(new SendMessageCommand({
      QueueUrl: requireEnv('ALERT_QUEUE_URL'),
      MessageBody: JSON.stringify({
        regionId: region.id,
        regionName: region.name,
        riskLevel,
        confidence: conf,
        score: total,
        rainfall24h: snapshot.accumulation.next24h,
        rainfall48h: snapshot.accumulation.total48h,
        detectedAt: snapshot.ts,
      }),
    }));
  }

  logJson('info', 'region scored', {
    region: region.name, riskLevel, total, weather: w, sensors: s, geo: g, alertThresholdReached,
  });
  return { riskLevel, total };
}

export const handler = async (event) => {
  const batchItemFailures = [];

  for (const record of event.Records) {
    try {
      await processOne(record.body);
    } catch (err) {
      // Reporting only this messageId means its 9 batch-mates still succeed.
      logJson('error', 'scoring failed', {
        messageId: record.messageId, error: String(err?.message ?? err),
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
