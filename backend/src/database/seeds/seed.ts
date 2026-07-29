import 'reflect-metadata';

import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import AppDataSource from '../data-source';
import { CompanyEntity } from '../../auth/entities/company.entity';
import { RoleEntity } from '../../auth/entities/role.entity';
import {
  UserEntity,
  UserStatus,
} from '../../auth/entities/user.entity';

const BCRYPT_ROUNDS = 12;

const DEFAULT_ADMIN_EMAIL = 'admin@tallysync.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';
const DEFAULT_ADMIN_NAME = 'System Administrator';
const DEFAULT_COMPANY_NAME = 'TallySync';
const DEFAULT_TALLY_COMPANY_NAME = 'TallySync';

type SeedRole = {
  name: string;
  description: string;
  isSystem: boolean;
};

const DEFAULT_ROLES: SeedRole[] = [
  {
    name: 'admin',
    description: 'Full system access',
    isSystem: true,
  },
  {
    name: 'company_owner',
    description: 'Company-level administration access',
    isSystem: true,
  },
  {
    name: 'sales_rep',
    description: 'Sales and customer management access',
    isSystem: true,
  },
];

async function seedRoles(
  dataSource: DataSource,
): Promise<Map<string, RoleEntity>> {
  const roleRepository = dataSource.getRepository(RoleEntity);
  const roles = new Map<string, RoleEntity>();

  for (const definition of DEFAULT_ROLES) {
    let role = await roleRepository.findOne({
      where: { name: definition.name },
    });

    if (!role) {
      role = roleRepository.create(definition);
      role = await roleRepository.save(role);
      console.log(`Created role: ${role.name}`);
    } else {
      let changed = false;

      if (role.description !== definition.description) {
        role.description = definition.description;
        changed = true;
      }

      if (role.isSystem !== definition.isSystem) {
        role.isSystem = definition.isSystem;
        changed = true;
      }

      if (changed) {
        role = await roleRepository.save(role);
        console.log(`Updated role: ${role.name}`);
      } else {
        console.log(`Role already exists: ${role.name}`);
      }
    }

    roles.set(role.name, role);
  }

  return roles;
}

async function seedCompany(dataSource: DataSource): Promise<CompanyEntity> {
  const companyRepository = dataSource.getRepository(CompanyEntity);

  const companyName =
    process.env.SEED_COMPANY_NAME?.trim() || DEFAULT_COMPANY_NAME;
  const tallyCompanyName =
    process.env.SEED_TALLY_COMPANY_NAME?.trim() ||
    DEFAULT_TALLY_COMPANY_NAME;

  let company = await companyRepository.findOne({
    where: { name: companyName },
    withDeleted: true,
  });

  if (!company) {
    company = companyRepository.create({
      name: companyName,
      tallyCompanyName,
      isActive: true,
    });

    company = await companyRepository.save(company);
    console.log(`Created company: ${company.name}`);
    return company;
  }

  let changed = false;

  if (company.tallyCompanyName !== tallyCompanyName) {
    company.tallyCompanyName = tallyCompanyName;
    changed = true;
  }

  if (!company.isActive) {
    company.isActive = true;
    changed = true;
  }

  if (company.deletedAt) {
    await companyRepository.restore(company.id);
    company.deletedAt = null;
    changed = true;
  }

  if (changed) {
    company = await companyRepository.save(company);
    console.log(`Updated company: ${company.name}`);
  } else {
    console.log(`Company already exists: ${company.name}`);
  }

  return company;
}

async function seedAdmin(
  dataSource: DataSource,
  adminRole: RoleEntity,
  company: CompanyEntity,
): Promise<UserEntity> {
  const userRepository = dataSource.getRepository(UserEntity);

  const email = (
    process.env.SEED_ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL
  ).toLowerCase();
  const password =
    process.env.SEED_ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const fullName =
    process.env.SEED_ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME;

  let admin = await userRepository.findOne({
    where: { email },
    withDeleted: true,
  });

  if (!admin) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    admin = userRepository.create({
      companyId: company.id,
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

    admin = await userRepository.save(admin);
    console.log(`Created administrator: ${admin.email}`);
    return admin;
  }

  let changed = false;

  if (admin.roleId !== adminRole.id) {
    admin.roleId = adminRole.id;
    changed = true;
  }

  if (admin.companyId !== company.id) {
    admin.companyId = company.id;
    changed = true;
  }

  if (admin.fullName !== fullName) {
    admin.fullName = fullName;
    changed = true;
  }

  if (admin.status !== UserStatus.ACTIVE) {
    admin.status = UserStatus.ACTIVE;
    changed = true;
  }

  if (admin.deletedAt) {
    await userRepository.restore(admin.id);
    admin.deletedAt = null;
    changed = true;
  }

  if (process.env.SEED_RESET_ADMIN_PASSWORD === 'true') {
    admin.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    changed = true;
  }

  if (changed) {
    admin = await userRepository.save(admin);
    console.log(`Updated administrator: ${admin.email}`);
  } else {
    console.log(`Administrator already exists: ${admin.email}`);
  }

  return admin;
}

async function runSeed(): Promise<void> {
  let initializedHere = false;

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      initializedHere = true;
    }

    await AppDataSource.transaction(async (transactionManager) => {
      const transactionDataSource = transactionManager.connection;

      const roles = await seedRoles(transactionDataSource);
      const adminRole = roles.get('admin');

      if (!adminRole) {
        throw new Error('Admin role could not be created or loaded');
      }

      const company = await seedCompany(transactionDataSource);
      await seedAdmin(transactionDataSource, adminRole, company);
    });

    console.log('Database seed completed successfully.');
    console.log(
      `Admin login: ${
        process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
      }`,
    );

    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.warn(
        'Development password is Admin@123. Change it immediately after login.',
      );
    }
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);

    console.error('Database seed failed:');
    console.error(message);
    process.exitCode = 1;
  } finally {
    if (initializedHere && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

void runSeed();
