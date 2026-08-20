import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users.service';
import { LicensingService } from '../../licensing/licensing.service';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { RoleEntity } from '../entities/role.entity';
import { AuditAction, AuditLogEntity } from '../entities/audit-log.entity';
import type { AssignCompanyDto } from '../dto/assign-company.dto';
import type { AssignRoleDto } from '../dto/assign-role.dto';
import type { CreateUserDto } from '../dto/create-user.dto';
import type { UpdateUserDto } from '../dto/update-user.dto';
import type { AuditContext } from '../interfaces/audit-context.interface';

const makeRole = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-uuid-1',
  name: 'sales_rep',
  description: null,
  isSystem: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  users: [],
  ...overrides,
});

const makeUser = (overrides: Partial<UserEntity> = {}): UserEntity => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  roleId: 'role-uuid-1',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('ValidPass1!', 12),
  phone: null,
  status: UserStatus.ACTIVE,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  role: makeRole(),
  ...overrides,
});

const makeAuditLog = (
  overrides: Partial<AuditLogEntity> = {},
): AuditLogEntity => ({
  id: 'audit-uuid-1',
  companyId: 'company-uuid-1',
  userId: 'actor-uuid-1',
  action: AuditAction.CREATE,
  entityType: 'user',
  entityId: 'user-uuid-1',
  oldValues: null,
  newValues: null,
  ipAddress: null,
  userAgent: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  actor: null,
  ...overrides,
});

const auditContext: AuditContext = {
  actorId: 'actor-uuid-1',
  companyId: 'company-uuid-1',
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
};

const createUserRepositoryMock = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn((value: Partial<UserEntity>) => value as UserEntity),
  save: jest.fn(async (value: UserEntity) => value),
  softDelete: jest.fn(),
});

const createRoleRepositoryMock = () => ({
  findOne: jest.fn(),
});

const createLicensingServiceMock = () => ({
  assertUserCapacity: jest.fn().mockResolvedValue(undefined),
});

const createAuditRepositoryMock = () => ({
  findAndCount: jest.fn(),
  create: jest.fn((value: Partial<AuditLogEntity>) => value as AuditLogEntity),
  save: jest.fn(async (value: AuditLogEntity) => value),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: ReturnType<typeof createUserRepositoryMock>;
  let roleRepository: ReturnType<typeof createRoleRepositoryMock>;
  let auditRepository: ReturnType<typeof createAuditRepositoryMock>;
  let licensingService: ReturnType<typeof createLicensingServiceMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(UserEntity),
          useFactory: createUserRepositoryMock,
        },
        {
          provide: getRepositoryToken(RoleEntity),
          useFactory: createRoleRepositoryMock,
        },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useFactory: createAuditRepositoryMock,
        },
        {
          provide: LicensingService,
          useFactory: createLicensingServiceMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    roleRepository = module.get(getRepositoryToken(RoleEntity));
    auditRepository = module.get(getRepositoryToken(AuditLogEntity));
    licensingService = module.get(LicensingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser()', () => {
    const dto: CreateUserDto = {
      companyId: 'company-uuid-1',
      roleId: 'role-uuid-1',
      fullName: 'New User',
      email: 'new@example.com',
      password: 'ValidPass1!',
    };

    it('creates a user and writes a CREATE audit log', async () => {
      const role = makeRole();
      const saved = makeUser({
        id: 'new-user-id',
        email: dto.email,
        fullName: dto.fullName,
        role,
      });

      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(saved);
      roleRepository.findOne.mockResolvedValue(role);
      userRepository.create.mockReturnValue(saved);
      userRepository.save.mockResolvedValue(saved);

      const result = await service.createUser(dto, auditContext);

      expect(result).toBeDefined();
      expect(userRepository.save).toHaveBeenCalledTimes(1);
      expect(licensingService.assertUserCapacity).toHaveBeenCalledWith(
        dto.companyId,
      );
      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.CREATE,
          entityType: 'user',
          entityId: saved.id,
          companyId: auditContext.companyId,
          userId: auditContext.actorId,
        }),
      );
    });

    it('hashes the password before persisting', async () => {
      const role = makeRole();
      let captured: Partial<UserEntity> | undefined;

      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      roleRepository.findOne.mockResolvedValue(role);

      userRepository.create.mockImplementation((value: Partial<UserEntity>) => {
        captured = value;
        return value as UserEntity;
      });

      userRepository.save.mockImplementation(async (value: UserEntity) =>
        makeUser({
          ...value,
          id: 'new-user-id',
          role,
        }),
      );

      await service.createUser(dto, auditContext);

      expect(captured?.passwordHash).toBeDefined();
      expect(captured?.passwordHash).not.toBe(dto.password);

      const matches = await bcrypt.compare(
        dto.password,
        captured?.passwordHash ?? '',
      );

      expect(matches).toBe(true);
    });

    it('throws ConflictException for duplicate email', async () => {
      userRepository.findOne.mockResolvedValueOnce(
        makeUser({ email: dto.email }),
      );

      await expect(service.createUser(dto, auditContext)).rejects.toThrow(
        ConflictException,
      );

      expect(roleRepository.findOne).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for missing role', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);
      roleRepository.findOne.mockResolvedValue(null);

      await expect(service.createUser(dto, auditContext)).rejects.toThrow(
        NotFoundException,
      );

      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('listUsers()', () => {
    it('returns paginated users', async () => {
      userRepository.findAndCount.mockResolvedValue([[makeUser()], 1]);

      const result = await service.listUsers({
        page: 1,
        limit: 10,
      });

      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(result.data).toHaveLength(1);
    });

    it('builds two search conditions', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers({
        search: 'Alice',
        page: 1,
        limit: 10,
      });

      const options = userRepository.findAndCount.mock.calls[0]?.[0];

      expect(options).toBeDefined();
      expect(Array.isArray(options?.where)).toBe(true);

      if (!Array.isArray(options?.where)) {
        throw new Error('Expected listUsers where option to be an array');
      }

      expect(options.where).toHaveLength(2);
    });

    it('applies company and status filters', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers({
        companyId: 'company-uuid-1',
        status: UserStatus.ACTIVE,
        page: 1,
        limit: 10,
      });

      const options = userRepository.findAndCount.mock.calls[0]?.[0];

      expect(options).toBeDefined();

      if (!Array.isArray(options?.where)) {
        throw new Error('Expected listUsers where option to be an array');
      }

      expect(options.where[0]).toEqual(
        expect.objectContaining({
          companyId: 'company-uuid-1',
          status: UserStatus.ACTIVE,
        }),
      );
    });
  });

  describe('getUserById()', () => {
    it('returns a user when found', async () => {
      userRepository.findOne.mockResolvedValue(makeUser());

      await expect(service.getUserById('user-uuid-1')).resolves.toBeDefined();
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('missing-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser()', () => {
    const dto: UpdateUserDto = {
      fullName: 'Updated Name',
      phone: '555-1234',
    };

    it('updates and writes UPDATE audit action', async () => {
      const user = makeUser();
      const updated = {
        ...user,
        ...dto,
      };

      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockResolvedValue(updated);

      const result = await service.updateUser(user.id, dto, auditContext);

      expect(result).toBeDefined();
      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.UPDATE,
          entityId: user.id,
        }),
      );
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUser('missing-user', dto, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser()', () => {
    it('soft deletes and writes DELETE audit action', async () => {
      const user = makeUser();

      userRepository.findOne.mockResolvedValue(user);
      userRepository.softDelete.mockResolvedValue({
        affected: 1,
        raw: [],
      });

      await service.deleteUser(user.id, auditContext);

      expect(userRepository.softDelete).toHaveBeenCalledWith(user.id);
      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DELETE,
          entityId: user.id,
        }),
      );
    });

    it('prevents actor deleting themselves', async () => {
      userRepository.findOne.mockResolvedValue(
        makeUser({ id: auditContext.actorId }),
      );

      await expect(
        service.deleteUser(auditContext.actorId, auditContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('prevents deleting last active admin', async () => {
      userRepository.findOne.mockResolvedValue(
        makeUser({
          role: makeRole({
            name: 'admin',
            isSystem: true,
          }),
        }),
      );
      userRepository.count.mockResolvedValue(1);

      await expect(
        service.deleteUser('user-uuid-1', auditContext),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteUser('missing-user', auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignRole()', () => {
    const dto: AssignRoleDto = {
      roleId: 'role-uuid-2',
    };

    it('assigns role and writes ASSIGN_ROLE audit action', async () => {
      const existing = makeUser();
      const role = makeRole({
        id: dto.roleId,
        name: 'company_owner',
      });
      const updated = makeUser({
        roleId: dto.roleId,
        role,
      });

      userRepository.findOne
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(updated);
      roleRepository.findOne.mockResolvedValue(role);
      userRepository.save.mockResolvedValue(updated);

      const result = await service.assignRole(existing.id, dto, auditContext);

      expect(result).toBeDefined();
      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ASSIGN_ROLE,
          entityId: existing.id,
          oldValues: {
            roleId: 'role-uuid-1',
          },
          newValues: {
            roleId: dto.roleId,
            roleName: role.name,
          },
        }),
      );
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRole('missing-user', dto, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when role is missing', async () => {
      userRepository.findOne.mockResolvedValue(makeUser());
      roleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignRole('user-uuid-1', dto, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignCompany()', () => {
    const dto: AssignCompanyDto = {
      companyId: 'company-uuid-2',
    };

    it('assigns company and writes ASSIGN_COMPANY audit action', async () => {
      const existing = makeUser();
      const updated = makeUser({
        companyId: dto.companyId,
      });

      userRepository.findOne.mockResolvedValue(existing);
      userRepository.save.mockResolvedValue(updated);

      await service.assignCompany(existing.id, dto, auditContext);

      expect(auditRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.ASSIGN_COMPANY,
          entityId: existing.id,
          oldValues: {
            companyId: 'company-uuid-1',
          },
          newValues: {
            companyId: dto.companyId,
          },
        }),
      );
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignCompany('missing-user', dto, auditContext),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserActivity()', () => {
    it('returns paginated audit logs', async () => {
      userRepository.findOne.mockResolvedValue(makeUser());
      auditRepository.findAndCount.mockResolvedValue([[makeAuditLog()], 1]);

      const result = await service.getUserActivity('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.action).toBe(AuditAction.CREATE);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('throws when user is missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserActivity('missing-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
