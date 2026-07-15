import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  /** Must match the sub from the expired access token — used for user lookup. */
  @IsUUID('4')
  @IsNotEmpty()
  userId: string;
}
