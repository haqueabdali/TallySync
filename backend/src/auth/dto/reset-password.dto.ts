import {
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsUUID('4')
  @IsNotEmpty()
  userId: string;

  /** The raw one-time token e-mailed to the user */
  @IsString()
  @IsNotEmpty()
  token: string;

  /**
   * Password rules:
   *   ≥ 8 chars · ≤ 128 chars
   *   at least one uppercase, one lowercase, one digit, one special char
   */
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'newPassword must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
