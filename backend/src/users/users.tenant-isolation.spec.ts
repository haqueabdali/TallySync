import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { LicensingService } from '../licensing/licensing.service';
import { RoleEntity } from '../auth/entities/role.entity';
import { UserEntity, UserStatus } from '../auth/entities/user.entity';
import { AuditLogEntity } from './entities/audit-log.entity';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UsersService } from './users.service';

const companyAAdmin: AuthenticatedUser = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'admin-a@example.com',
  role: 'admin',
  companyId: '11111111-1111-4111-8111-111111111111',
  fullName: 'Company A Admin',
};

const platformAdmin: AuthenticatedUser = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  email: 'owner@tallysync.com',
  role: 'admin',
  companyId: null,
  fullName: 'Platform Owner',
};

const adminRole = (): RoleEntity =>
  ({
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'admin',
    description: null,
    isSystem: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    users: [],
  }) as RoleEntity;

const makeUser = (companyId: string): UserEntity =>
  ({
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    companyId,
    roleId: adminRole().id,
    fullName: 'Customer Admin',
    email: 'customer@example.com',
    passwordHash: 'hash',
    phone: null,
    status: UserStatus.ACTIVE,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    role: adminRole(),
  }) as UserEntity;

describe('UsersService tenant isolation', () => {
  let service: UsersService;
  let userRepository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
  };
  let roleRepository: { findOne: jest.Mock };
  let auditRepository: {
    findAndCount: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
      softDelete: jest.fn(),
    };
    roleRepository = { findOne: jest.fn() };
    auditRepository = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(RoleEntity), useValue: roleRepository },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: auditRepository,
        },
        {
          provide: LicensingService,
          useValue: {
            assertUserCapacity: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('forces customer admins to list only their own company even if another companyId is requested', async () => {
    await service.listUsers(
      {
        companyId: '22222222-2222-4222-8222-222222222222',
        page: 1,
        limit: 20,
      },
      companyAAdmin,
    );

    const options = userRepository.findAndCount.mock.calls[0]?.[0];
    expect(options.where[0]).toEqual(
      expect.objectContaining({ companyId: companyAAdmin.companyId }),
    );
  });

  it('allows the platform admin to use an explicit cross-company list filter', async () => {
    const companyB = '22222222-2222-4222-8222-222222222222';
    await service.listUsers(
      { companyId: companyB, page: 1, limit: 20 },
      platformAdmin,
    );

    const options = userRepository.findAndCount.mock.calls[0]?.[0];
    expect(options.where[0]).toEqual(
      expect.objectContaining({ companyId: companyB }),
    );
  });

  it('hides another company user from a customer admin', async () => {
    userRepository.findOne.mockResolvedValue(
      makeUser('22222222-2222-4222-8222-222222222222'),
    );

    await expect(
      service.getUser('dddddddd-dddd-4ddd-8ddd-dddddddddddd', companyAAdmin),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects creating a user for another company even when the customer actor role is admin', async () => {
    userRepository.findOne.mockResolvedValueOnce(null);
    roleRepository.findOne.mockResolvedValue(adminRole());

    await expect(
      service.createUser(
        {
          companyId: '22222222-2222-4222-8222-222222222222',
          roleId: adminRole().id,
          fullName: 'Other Company User',
          email: 'other@example.com',
          password: 'ValidPass1!',
        },
        companyAAdmin,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects updating another company user', async () => {
    userRepository.findOne.mockResolvedValue(
      makeUser('22222222-2222-4222-8222-222222222222'),
    );

    await expect(
      service.updateUser(
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        { fullName: 'Forbidden Update' },
        companyAAdmin,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects assigning a role to another company user', async () => {
    userRepository.findOne.mockResolvedValue(
      makeUser('22222222-2222-4222-8222-222222222222'),
    );
    roleRepository.findOne.mockResolvedValue(adminRole());

    await expect(
      service.assignRole(
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        { roleId: adminRole().id },
        companyAAdmin,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects deleting another company user', async () => {
    userRepository.findOne.mockResolvedValue(
      makeUser('22222222-2222-4222-8222-222222222222'),
    );

    await expect(
      service.deleteUser('dddddddd-dddd-4ddd-8ddd-dddddddddddd', companyAAdmin),
    ).rejects.toThrow(NotFoundException);
  });

  it('allows only the platform admin to reassign a user between companies', async () => {
    await expect(
      service.assignCompany(
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        { companyId: '22222222-2222-4222-8222-222222222222' },
        companyAAdmin,
      ),
    ).rejects.toThrow(ForbiddenException);

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('hides another company user activity from a customer admin', async () => {
    userRepository.findOne.mockResolvedValue(
      makeUser('22222222-2222-4222-8222-222222222222'),
    );

    await expect(
      service.getUserActivity(
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        1,
        20,
        companyAAdmin,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(auditRepository.findAndCount).not.toHaveBeenCalled();
  });

  it('scopes the last-active-admin count to the target company', async () => {
    const ownAdmin = makeUser(companyAAdmin.companyId!);
    ownAdmin.id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    userRepository.findOne.mockResolvedValue(ownAdmin);
    userRepository.count.mockResolvedValue(2);

    await service.deleteUser(ownAdmin.id, companyAAdmin);

    expect(userRepository.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: companyAAdmin.companyId,
        roleId: ownAdmin.roleId,
        status: UserStatus.ACTIVE,
      }),
    });
  });
});
