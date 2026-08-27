import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Guards the /api/internal/* surface, which is called by the Task #2 Lambdas
 * rather than by browsers.
 *
 * These routes deliberately do NOT use JwtAuthGuard: the callers are services,
 * not users, so there is no user to mint a token for. Instead they present the
 * shared `internal_api_key` from Secrets Manager.
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  private readonly logger = new Logger(InternalKeyGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const presented = req.header('x-internal-key') ?? '';
    const expected = this.config.get<string>('INTERNAL_API_KEY') ?? '';

    if (!expected) {
      // Fail closed. A missing key on the server must never mean "allow all".
      this.logger.error('INTERNAL_API_KEY is not configured — refusing internal request');
      throw new UnauthorizedException();
    }

    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    // Compare in constant time, and only when lengths match (timingSafeEqual
    // throws on length mismatch, which would itself leak the expected length).
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      this.logger.warn(`rejected internal call to ${req.path}`);
      throw new UnauthorizedException();
    }
    return true;
  }
}
