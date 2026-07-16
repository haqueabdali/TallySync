import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

import { UserStatus } from '../../auth/entities/user.entity';

export type UserSortField =
  'createdAt' | 'updatedAt' | 'fullName' | 'email' | 'status';

export type SortOrder = 'ASC' | 'DESC';

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'fullName', 'email', 'status'])
  sortBy: UserSortField = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: SortOrder = 'DESC';
}
