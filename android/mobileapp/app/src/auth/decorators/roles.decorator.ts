import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../../users/user-role.enum';

export const ROLES_METADATA = 'roles';

export const Roles = (...roles: UserRole[]) =>
  SetMetadata(ROLES_METADATA, roles);
