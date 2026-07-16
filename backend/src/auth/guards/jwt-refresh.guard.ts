import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error, user: TUser): TUser {
    if (err || !user) {
      throw (
        err ?? new UnauthorizedException('Refresh token is missing or invalid')
      );
    }
    return user;
  }
}
