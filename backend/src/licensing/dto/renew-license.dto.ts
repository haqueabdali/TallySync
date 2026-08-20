import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RenewLicenseDto {
  @IsDateString()
  expiresAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  renewalNote?: string | null;
}
