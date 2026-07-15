import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserStatus } from '../../auth/entities/user.entity';
/**
 * All fields optional — PATCH semantics.
 * Email and companyId are intentionally excluded:
 *   - Email changes require a dedicated verification flow.
 *   - Company transfers are done via a separate endpoint.
 * Password changes go through auth/change-password.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => (value as string).trim())
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
