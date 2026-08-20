import * as bcrypt from 'bcrypt';
import { isEmail } from 'class-validator';
import { IsNull, type DataSource, type EntityManager } from 'typeorm';

import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { LicenseSessionEntity } from '../licensing/entities/license-session.entity';

const PLATFORM_ADMIN_ROLE_NAME = 'admin';
const DEFAULT_PLATFORM_ADMIN_NAME = 'TallySync Platform Owner';
const DEFAULT_BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 128;

export interface PlatformOwnerBootstrapConfig {
  email: string;
  password: string;
  fullName: string;
  bcryptRounds: number;
}

export interface PlatformOwnerBootstrapResult {
  action: 'created' | 'updated' | 'unchanged';
  userId: string;
  email: string;
}

function requiredTrimmedValue(
  environment: NodeJS.ProcessEnv,
  name: string,
): string {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function readBcryptRounds(rawValue: string | undefined): number {
  if (!rawValue) return DEFAULT_BCRYPT_ROUNDS;
  const parsed = Number.parseInt(rawValue, 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_BCRYPT_ROUNDS;
}

export function readPlatformOwnerBootstrapConfig(
  environment: NodeJS.ProcessEnv = process.env,
): PlatformOwnerBootstrapConfig {
  const email = requiredTrimmedValue(
    environment,
    'PLATFORM_ADMIN_EMAIL',
  ).toLowerCase();
  const password = environment.PLATFORM_ADMIN_PASSWORD;
  const fullName =
    environment.PLATFORM_ADMIN_NAME?.trim() || DEFAULT_PLATFORM_ADMIN_NAME;

  if (!password) throw new Error('PLATFORM_ADMIN_PASSWORD is required.');
  if (!isEmail(email) || email.length > 255) {
    throw new Error('PLATFORM_ADMIN_EMAIL must be a valid email address.');
  }
  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error(
      `PLATFORM_ADMIN_PASSWORD must contain ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
  if (fullName.length > 255) {
    throw new Error('PLATFORM_ADMIN_NAME must not exceed 255 characters.');
  }

  return {
    email,
    password,
    fullName,
    bcryptRounds: readBcryptRounds(environment.BCRYPT_ROUNDS),
  };
}

async function revokeExistingCredentials(
  manager: EntityManager,
  userId: string,
): Promise<void> {
  await manager
    .getRepository(RefreshTokenEntity)
    .update({ userId, isRevoked: false }, { isRevoked: true });
  await manager
    .getRepository(LicenseSessionEntity)
    .update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );
}

export async function bootstrapPlatformOwner(
  dataSource: DataSource,
  config: PlatformOwnerBootstrapConfig,
): Promise<PlatformOwnerBootstrapResult> {
  return dataSource.transaction(async (manager) => {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      ['tallysync:platform-owner-bootstrap'],
    );

    const roleRepository = manager.getRepository(RoleEntity);
    const userRepository = manager.getRepository(UserEntity);

    const adminRole = await roleRepository.findOne({
      where: { name: PLATFORM_ADMIN_ROLE_NAME },
    });
    if (!adminRole) {
      throw new Error(
        'The admin role does not exist. Run the normal database seed first.',
      );
    }

    const accountByEmail = await userRepository.findOne({
      where: { email: config.email },
      withDeleted: true,
    });

    if (accountByEmail && accountByEmail.companyId !== null) {
      throw new Error(
        `The email ${config.email} already belongs to a company user. ` +
          'Choose a different PLATFORM_ADMIN_EMAIL so the customer administrator remains separate.',
      );
    }

    const existingPlatformOwners = await userRepository.find({
      where: {
        companyId: IsNull(),
        roleId: adminRole.id,
      },
      withDeleted: true,
      order: { createdAt: 'ASC' },
      take: 2,
    });
    if (
      existingPlatformOwners.length > 1 ||
      (accountByEmail &&
        existingPlatformOwners.length === 1 &&
        existingPlatformOwners[0].id !== accountByEmail.id)
    ) {
      throw new Error(
        'Multiple platform-owner accounts already exist. Resolve them before running the bootstrap.',
      );
    }

    let platformOwner = accountByEmail ?? existingPlatformOwners[0] ?? null;

    if (!platformOwner) {
      platformOwner = userRepository.create({
        companyId: null,
        roleId: adminRole.id,
        fullName: config.fullName,
        email: config.email,
        passwordHash: await bcrypt.hash(config.password, config.bcryptRounds),
        phone: null,
        status: UserStatus.ACTIVE,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        lastLoginAt: null,
      });
      platformOwner = await userRepository.save(platformOwner);

      return {
        action: 'created',
        userId: platformOwner.id,
        email: platformOwner.email,
      };
    }

    let changed = false;
    let securityStateChanged = false;

    if (platformOwner.deletedAt) {
      await userRepository.restore(platformOwner.id);
      platformOwner.deletedAt = null;
      changed = true;
      securityStateChanged = true;
    }
    if (platformOwner.roleId !== adminRole.id) {
      platformOwner.roleId = adminRole.id;
      changed = true;
      securityStateChanged = true;
    }
    if (platformOwner.email !== config.email) {
      platformOwner.email = config.email;
      changed = true;
      securityStateChanged = true;
    }
    if (platformOwner.fullName !== config.fullName) {
      platformOwner.fullName = config.fullName;
      changed = true;
    }
    if (platformOwner.status !== UserStatus.ACTIVE) {
      platformOwner.status = UserStatus.ACTIVE;
      changed = true;
      securityStateChanged = true;
    }
    if (platformOwner.resetTokenHash || platformOwner.resetTokenExpiresAt) {
      platformOwner.resetTokenHash = null;
      platformOwner.resetTokenExpiresAt = null;
      changed = true;
      securityStateChanged = true;
    }

    const passwordMatches = await bcrypt.compare(
      config.password,
      platformOwner.passwordHash,
    );
    if (!passwordMatches) {
      platformOwner.passwordHash = await bcrypt.hash(
        config.password,
        config.bcryptRounds,
      );
      changed = true;
      securityStateChanged = true;
    }

    if (!changed) {
      return {
        action: 'unchanged',
        userId: platformOwner.id,
        email: platformOwner.email,
      };
    }

    platformOwner = await userRepository.save(platformOwner);
    if (securityStateChanged) {
      await revokeExistingCredentials(manager, platformOwner.id);
    }

    return {
      action: 'updated',
      userId: platformOwner.id,
      email: platformOwner.email,
    };
  });
}
