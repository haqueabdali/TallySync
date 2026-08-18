import { IsString, MaxLength, MinLength, Matches } from 'class-validator';

const VERSION_PATTERN = /^\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

export class CreateLicenseActivationDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  installationId: string;

  @IsString()
  @MinLength(32)
  @MaxLength(128)
  fingerprintHash: string;

  @IsString()
  @Matches(VERSION_PATTERN)
  appVersion: string;
}
