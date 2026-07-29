import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protects endpoints intended only for trusted backend services.
 *
 * Required header:
 *   X-Internal-Service-Key: <shared secret>
 *
 * The value must match INTERNAL_SERVICE_KEY.
 */
@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedHeader = request.headers['x-internal-service-key'];
    const providedKey = Array.isArray(providedHeader)
      ? providedHeader[0]
      : providedHeader;

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
