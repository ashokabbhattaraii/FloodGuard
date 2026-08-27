// Shared helpers, copied into every function bundle at build time.
// Kept dependency-free: the Node 22 Lambda runtime already ships AWS SDK v3,
// so bundles stay a few KB and cold starts stay short.

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secrets = new SecretsManagerClient({});
let cachedSecret = null;

/**
 * Secrets are fetched once per execution environment, not per invocation.
 * Secrets Manager bills per 10k API calls, and a warm container may serve
 * thousands of invocations — this is the difference between free and not.
 */
export async function getSecret() {
  if (cachedSecret) return cachedSecret;
  const name = requireEnv('SECRET_NAME');
  const res = await secrets.send(new GetSecretValueCommand({ SecretId: name }));
  cachedSecret = JSON.parse(res.SecretString);
  return cachedSecret;
}

export function requireEnv(key) {
  const v = process.env[key];
  if (!v) throw new Error(`missing required env var ${key}`);
  return v;
}

/**
 * Call the NestJS monolith's internal API.
 *
 * ARCHITECTURAL NOTE: the Lambdas deliberately never open a connection to
 * Postgres. The monolith owns RDS; the serverless tier owns DynamoDB + S3.
 * That boundary is what keeps these functions OUTSIDE the VPC, which in turn
 * avoids a ~$32/month NAT Gateway (fg-weather-ingest needs outbound internet
 * to reach Open-Meteo) and lets the RDS security group stay closed to
 * everything except the EB security group.
 */
export async function internalFetch(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const base = requireEnv('BACKEND_URL').replace(/\/+$/, '');
  const { internal_api_key: key } = await getSecret();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': key,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`internal API ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

/** fetch with a hard timeout — an un-aborted fetch can hang until the Lambda dies. */
export async function fetchJson(url, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Structured single-line JSON logs — required for CloudWatch Logs Insights queries. */
export function logJson(level, message, extra = {}) {
  console.log(JSON.stringify({ level, message, ...extra }));
}

/** Uniform API Gateway response with CORS. */
export function apiResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type,authorization',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
