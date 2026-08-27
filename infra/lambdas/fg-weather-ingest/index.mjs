/**
 * fg-weather-ingest — scheduled ingestion (EventBridge Scheduler, rate(10 minutes))
 *
 * Replaces the @Cron(EVERY_10_MINUTES) job in
 * backend/src/flood-forecast/flood-monitor.scheduler.ts.
 *
 * WHY THIS MATTERS: @nestjs/schedule runs the cron on EVERY EB instance. The
 * moment Elastic Beanstalk autoscales past one box, that job double-fires and
 * residents get duplicate flood alerts. EventBridge Scheduler fires exactly once
 * regardless of fleet size, so moving it here fixes a latent production bug
 * rather than merely relocating code.
 *
 * The NestJS cron MUST be disabled (FLOOD_MONITOR_ENABLED=false) or both run.
 *
 * Responsibility: I/O only. Fetch weather, persist the snapshot, fan out one SQS
 * message per region. Scoring is deliberately NOT done here — that is
 * fg-flood-forecast's job, so a slow scoring change never stalls ingestion.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { internalFetch, fetchJson, logJson, requireEnv } from './common.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sqs = new SQSClient({});

const SNAPSHOT_TTL_DAYS = 30;

/** Sum the first `n` hourly values. Mirrors weather.service.getHourlyRainfall. */
const sum = (arr, n) => arr.slice(0, n).reduce((s, v) => s + (v || 0), 0);
const round1 = (n) => Math.round(n * 10) / 10;

async function snapshotRegion(region) {
  const { id, name, centerLat, centerLng } = region;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${centerLat}&longitude=${centerLng}` +
    `&hourly=precipitation,precipitation_probability&timezone=auto&forecast_hours=48`;

  const data = await fetchJson(url);
  const precip = data?.hourly?.precipitation ?? [];
  const probs = data?.hourly?.precipitation_probability ?? [];
  const times = data?.hourly?.time ?? [];

  if (precip.length === 0) throw new Error(`Open-Meteo returned no precipitation for ${name}`);

  const accumulation = {
    next6h: round1(sum(precip, 6)),
    next12h: round1(sum(precip, 12)),
    next24h: round1(sum(precip, 24)),
    total48h: round1(sum(precip, precip.length)),
  };

  const peakIdx = precip.indexOf(Math.max(...precip));
  const snapshot = {
    regionId: id,
    ts: new Date().toISOString(),
    regionName: name,
    accumulation,
    maxProbability: Math.max(0, ...probs),
    peakRainfall: { time: times[peakIdx] ?? null, amount: precip[peakIdx] ?? 0 },
    // TTL: DynamoDB reclaims expired items for free, so this table never grows
    // unbounded and needs no cleanup job.
    expiresAt: Math.floor(Date.now() / 1000) + SNAPSHOT_TTL_DAYS * 86400,
  };

  await ddb.send(new PutCommand({ TableName: requireEnv('DDB_TABLE'), Item: snapshot }));
  return snapshot;
}

export const handler = async () => {
  const started = Date.now();
  const regions = await internalFetch('/api/internal/regions');
  logJson('info', 'regions fetched', { count: regions.length });

  // Settled, not all: one bad region must not abort the whole sweep.
  const results = await Promise.allSettled(regions.map(snapshotRegion));

  const messages = [];
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      messages.push({ snapshot: r.value, region: regions[i] });
    } else {
      failed++;
      logJson('error', 'snapshot failed', {
        region: regions[i]?.name,
        error: String(r.reason?.message ?? r.reason),
      });
    }
  });

  // SendMessageBatch caps at 10 entries per call.
  for (let i = 0; i < messages.length; i += 10) {
    const chunk = messages.slice(i, i + 10);
    await sqs.send(new SendMessageBatchCommand({
      QueueUrl: requireEnv('FORECAST_QUEUE_URL'),
      Entries: chunk.map((m, j) => ({
        Id: `${i + j}`,
        MessageBody: JSON.stringify({ snapshot: m.snapshot, region: m.region }),
      })),
    }));
  }

  const out = {
    regions: regions.length,
    enqueued: messages.length,
    failed,
    durationMs: Date.now() - started,
  };
  logJson('info', 'ingest complete', out);
  return out;
};
