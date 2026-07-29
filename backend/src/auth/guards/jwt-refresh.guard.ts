import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Validates refresh tokens using the `jwt-refresh` Passport strategy.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false | null): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException('Refresh token is missing or invalid');
    }

    return user;
  }
}
