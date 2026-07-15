import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

// ── Password policy ─────────────────────────────────────────────────────────
// Min 8 chars, at least one uppercase, one lowercase, one digit, one special char.
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#]).{8,}$/;
const PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include uppercase, lowercase, digit, and special character';

// ── Login ───────────────────────────────────────────────────────────────────

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'P@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;
}

// ── Refresh Token ────────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ── Logout ───────────────────────────────────────────────────────────────────

export class LogoutDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ── Forgot Password ──────────────────────────────────────────────────────────

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  email: string;
}

export class ForgotPasswordResponseDto {
  @ApiProperty()
  message: string;
}

// ── Reset Password (used internally by the forgot-password flow) ─────────────

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;
}

// ── Change Password ───────────────────────────────────────────────────────────

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword: string;

  @ApiProperty({ example: 'N3wP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty()
  message: string;
}

// ── JWT Payload ───────────────────────────────────────────────────────────────

export class JwtPayloadDto {
  sub: string;        // user UUID
  email: string;
  role: string;
  companyId: string;
  iat?: number;
  exp?: number;
}

// ── Authenticated User (attached to request by JwtStrategy) ─────────────────

export class AuthenticatedUserDto {
  id: string;
  email: string;
  role: string;
  companyId: string;
  fullName: string;
}
