import 'dotenv/config';
import 'reflect-metadata';

import * as bcrypt from 'bcrypt';

import AppDataSource from '../../src/database/data-source';
import { RoleEntity } from '../../src/auth/entities/role.entity';
import {
  UserEntity,
  UserStatus,
} from '../../src/auth/entities/user.entity';

const BCRYPT_ROUNDS = 12;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function main(): Promise<void> {
  const email = requiredEnv('PLATFORM_ADMIN_EMAIL').toLowerCase();
  const password = requiredEnv('PLATFORM_ADMIN_PASSWORD');
  const fullName =
    process.env.PLATFORM_ADMIN_NAME?.trim() || 'TallySync Platform Owner';

  if (password.length < 12) {
    throw new Error('PLATFORM_ADMIN_PASSWORD must be at least 12 characters.');
  }

  let initializedHere = false;

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      initializedHere = true;
    }

    await AppDataSource.transaction(async (manager) => {
      const roleRepository = manager.getRepository(RoleEntity);
      const userRepository = manager.getRepository(UserEntity);

      const adminRole = await roleRepository.findOne({
        where: { name: 'admin' },
      });

      if (!adminRole) {
        throw new Error(
          'The admin role does not exist. Run the normal database seed first.',
        );
      }

      let platformAdmin = await userRepository.findOne({
        where: { email },
        withDeleted: true,
      });

      if (platformAdmin && platformAdmin.companyId !== null) {
        throw new Error(
          `The email ${email} already belongs to a company user. ` +
            'Choose a different PLATFORM_ADMIN_EMAIL so the company admin remains separate.',
        );
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      if (!platformAdmin) {
        platformAdmin = userRepository.create({
          companyId: null,
          roleId: adminRole.id,
          fullName,
          email,
          passwordHash,
          phone: null,
          status: UserStatus.ACTIVE,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          lastLoginAt: null,
        });
      } else {
        if (platformAdmin.deletedAt) {
          await userRepository.restore(platformAdmin.id);
          platformAdmin.deletedAt = null;
        }

        platformAdmin.companyId = null;
        platformAdmin.roleId = adminRole.id;
        platformAdmin.fullName = fullName;
        platformAdmin.passwordHash = passwordHash;
        platformAdmin.status = UserStatus.ACTIVE;
        platformAdmin.resetTokenHash = null;
        platformAdmin.resetTokenExpiresAt = null;
      }

      platformAdmin = await userRepository.save(platformAdmin);

      // Revoke prior refresh tokens if this account is being reset.
      await manager.query(
        `UPDATE refresh_tokens
         SET is_revoked = true
         WHERE user_id = $1 AND is_revoked = false`,
        [platformAdmin.id],
      );

      // V7+ session table may not exist in older environments, so only revoke
      // sessions when the table is present.
      const sessionTable = (await manager.query(
        `SELECT to_regclass('public.license_sessions') AS table_name`,
      )) as Array<{ table_name: string | null }>;

      if (sessionTable[0]?.table_name) {
        await manager.query(
          `UPDATE license_sessions
           SET is_revoked = true,
               revoked_at = COALESCE(revoked_at, now())
           WHERE user_id = $1 AND is_revoked = false`,
          [platformAdmin.id],
        );
      }

      console.log('Platform administrator is ready.');
      console.log(`Email: ${platformAdmin.email}`);
      console.log('Role: admin');
      console.log('Company: PLATFORM (companyId = null)');
    });
  } finally {
    if (initializedHere && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
