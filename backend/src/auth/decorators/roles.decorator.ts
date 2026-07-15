import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Usage: @Roles('admin', 'company_owner')
 * Works in tandem with RolesGuard.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
