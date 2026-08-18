import { IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class LicenseHeartbeatDto {
  @IsUUID()
  activationId: string;

  @IsString()
  @Length(10, 512)
  activationToken: string;

  @IsString()
  @Length(1, 128)
  installationId: string;

  @IsString()
  @Length(32, 128)
  fingerprintHash: string;

  @IsString()
  @MaxLength(32)
  appVersion: string;
}
