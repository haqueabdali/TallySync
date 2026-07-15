import { Exclude, Expose, Type } from 'class-transformer';

export class RoleResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() description: string | null;
}

@Exclude()
export class UserResponseDto {
  @Expose() id: string;
  @Expose() companyId: string;
  @Expose() fullName: string;
  @Expose() email: string;
  @Expose() phone: string | null;
  @Expose() status: string;
  @Expose() lastLoginAt: Date | null;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;

  @Expose()
  @Type(() => RoleResponseDto)
  role: RoleResponseDto;
}

export class PaginatedUsersResponseDto {
  data: UserResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ActivityLogResponseDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export class PaginatedActivityResponseDto {
  data: ActivityLogResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
