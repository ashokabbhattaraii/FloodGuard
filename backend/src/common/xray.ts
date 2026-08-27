import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/**
 * AWS X-Ray instrumentation for the NestJS monolith.
 *
 * Elastic Beanstalk's `aws:elasticbeanstalk:xray / XRayEnabled` option starts the
 * X-Ray daemon on the instance, but the daemon only forwards segments — it does
 * not create them. Without an SDK in the process, enabling that option yields an
 * empty service map. This is the piece that emits segments.
 *
 * Fail-open by design: tracing is observability, not functionality. If the SDK is
 * missing or the daemon is unreachable, the API must keep serving traffic.
 */
export async function enableXRay(app: INestApplication): Promise<void> {
  const logger = new Logger('XRay');

  // Only trace on AWS. Locally there is no daemon on 127.0.0.1:2000, and every
  // request would emit a noisy "connect ECONNREFUSED".
  if (process.env.NODE_ENV !== 'production') {
    logger.log('skipped (NODE_ENV is not production)');
    return;
  }

  try {
    const coreNs = await import('aws-xray-sdk-core');
    const sdk = ((coreNs as Record<string, unknown>).default ?? coreNs) as {
      captureHTTPsGlobal: (mod: unknown, downstream?: boolean) => void;
      capturePromise: () => void;
      setContextMissingStrategy: (s: string) => void;
      middleware: { setSamplingRules: (r: unknown) => void };
    };

    // A request arriving without a trace header (ALB health probes, direct hits)
    // must not throw. LOG_ERROR records it and continues.
    sdk.setContextMissingStrategy('LOG_ERROR');

    // Sampling: health checks fire every few seconds from the ALB, so pin them to
    // a low fixed rate and let real traffic dominate the trace volume (and bill).
    sdk.middleware.setSamplingRules({
      version: 2,
      rules: [
        {
          description: 'health checks',
          host: '*',
          http_method: 'GET',
          url_path: '/api/health',
          fixed_target: 0,
          rate: 0.01,
        },
      ],
      default: { fixed_target: 1, rate: 0.1 },
    });

    // Downstream capture is a NICE-TO-HAVE and is isolated in its own try.
    //
    // Previously this ran inline and killed the whole function: under
    // `module: nodenext`, `await import('node:https')` yields a frozen ESM
    // namespace object, and captureHTTPsGlobal tries to add a `__request`
    // property to it — throwing "Cannot add property __request, object is not
    // extensible". That took the inbound middleware down with it, so the service
    // map showed no backend node at all.
    //
    // Unwrapping `.default` gets the real, mutable CommonJS module object.
    try {
      for (const spec of ['node:https', 'node:http'] as const) {
        const ns = await import(spec);
        const mod = (ns as Record<string, unknown>).default ?? ns;
        sdk.captureHTTPsGlobal(mod, true);
      }
      sdk.capturePromise();
      logger.log('downstream HTTP capture enabled');
    } catch (err) {
      logger.warn(
        `downstream HTTP capture unavailable (${err instanceof Error ? err.message : String(err)}) — ` +
          'inbound request tracing still active',
      );
    }

    const expressNs = await import('aws-xray-sdk-express');
    const xrayExpress = ((expressNs as Record<string, unknown>).default ??
      expressNs) as {
      openSegment: (name: string) => unknown;
    };

    // openSegment must be registered before the routes it wraps. It closes the
    // segment itself on response finish, so no closeSegment is required for
    // traces to be emitted.
    const httpAdapter = app.getHttpAdapter().getInstance();
    httpAdapter.use(xrayExpress.openSegment('floodguard-backend'));

    logger.log('X-Ray tracing enabled (segment name: floodguard-backend)');
  } catch (err) {
    logger.warn(
      `X-Ray not enabled: ${err instanceof Error ? err.message : String(err)} — ` +
        'API continues without tracing',
    );
  }
}
