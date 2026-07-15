import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuditContext } from '../interfaces/audit-context.interface';

/**
 * Extracts audit metadata from the incoming HTTP request.
 *
 * Usage:
 *   createUser(@AuditCtx() ctx: AuditContext)
 *
 * Requires JwtAuthGuard to have already populated request.user.
 */
export const AuditCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuditContext => {
    const req = ctx.switchToHttp().getRequest<
      Request & { user?: { id: string; companyId: string } }
    >();

    const forwardedFor = req.headers['x-forwarded-for'] as string | undefined;
    const ipAddress = forwardedFor
      ? forwardedFor.split(',')[0].trim()
      : req.socket?.remoteAddress;

    return {
      actorId:   req.user?.id       ?? 'system',
      companyId: req.user?.companyId ?? '',
      ipAddress,
      userAgent: req.headers['user-agent'],
    };
  },
);
