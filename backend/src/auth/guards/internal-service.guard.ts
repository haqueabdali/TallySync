// src/modules/auth/guards/internal-service.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guards internal-only endpoints called by trusted backend services
 * (e.g. the Python Tally Sync Agent) rather than end-user clients.
 *
 * Expects header: X-Internal-Service-Key: <shared secret>
 * The shared secret must match INTERNAL_SERVICE_KEY in environment config
 * and should be rotated periodically and never exposed to the Android app.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-internal-service-key'];
    const expectedKey = this.configService.get<string>('INTERNAL_SERVICE_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException(
        'Internal service authentication is not configured',
      );
    }

    if (!providedKey || providedKey !== expectedKey) {
      throw new UnauthorizedException(
        'Invalid or missing internal service credentials',
      );
    }

    return true;
  }
}
