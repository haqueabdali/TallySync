import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { LicensePlan } from '../enums/license-plan.enum';
import { LicenseStatus } from '../enums/license-status.enum';

export class ListLicensesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsEnum(LicenseStatus)
  status?: LicenseStatus;

  @IsOptional()
  @IsEnum(LicensePlan)
  plan?: LicensePlan;
}
