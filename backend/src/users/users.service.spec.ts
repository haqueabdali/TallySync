import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from './users.service';
import { UserEntity, UserStatus } from './entities/user.entity';
import { RoleEntity } from './entities/role.entity';
import { AuditLogEntity, AuditAction } from './entities/audit-log.entity';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignCompanyDto } from './dto/assign-company.dto';
import { AuditContext } from './interfaces/audit-context.interface';

// ── Factories ─────────────────────────────────────────────────────────────────

const makeRole = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-uuid-1',
  name: 'sales_rep',
  description: null,
  isSystem: false,
  createdAt: new Date(),
  updatedAt: new Date(),
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
  createdAt: new Date(),
  updatedAt: new Date(),
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
  createdAt: new Date(),
  actor: null,
  ...overrides,
});

const mockAuditCtx: AuditContext = {
  actorId: 'actor-uuid-1',
  companyId: 'company-uuid-1',
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
};

// ── Repository Mocks ──────────────────────────────────────────────────────────

const mockUserRepo = () => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(),
  softDelete: jest.fn(),
});

const mockRoleRepo = () => ({
  findOne: jest.fn(),
});

const mockAuditRepo = () => ({
  findAndCount: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(),
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof mockUserRepo>;
  let roleRepo: ReturnType<typeof mockRoleRepo>;
  let auditRepo: ReturnType<typeof mockAuditRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(UserEntity), useFactory: mockUserRepo },
        { provide: getRepositoryToken(RoleEntity), useFactory: mockRoleRepo },
        {
          provide: getRepositoryToken(AuditLogEntity),
          useFactory: mockAuditRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(UserEntity));
    roleRepo = module.get(getRepositoryToken(RoleEntity));
    auditRepo = module.get(getRepositoryToken(AuditLogEntity));
  });

  afterEach(() => jest.clearAllMocks());

  // ── createUser() ───────────────────────────────────────────────────────────

  describe('createUser()', () => {
    const dto: CreateUserDto = {
      companyId: 'company-uuid-1',
      roleId: 'role-uuid-1',
      fullName: 'New User',
      email: 'new@example.com',
      password: 'ValidPass1!',
    };

    beforeEach(() => {
      userRepo.findOne.mockResolvedValueOnce(null); // email unique check
      roleRepo.findOne.mockResolvedValue(makeRole());
      userRepo.create.mockReturnValue(makeUser({ email: 'new@example.com' }));
      userRepo.save.mockResolvedValue(makeUser({ email: 'new@example.com' }));
      userRepo.findOne.mockResolvedValue(
        makeUser({ email: 'new@example.com' }),
      ); // reload
      auditRepo.create.mockReturnValue(makeAuditLog());
      auditRepo.save.mockResolvedValue(makeAuditLog());
    });

    it('creates a user and returns a sanitized response', async () => {
      const result = await service.createUser(dto, mockAuditCtx);

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('hashes the password before persisting (never stores plain text)', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);
      roleRepo.findOne.mockResolvedValue(makeRole());
      let capturedEntity: Partial<UserEntity> = {};
      userRepo.create.mockImplementation((e) => {
        capturedEntity = e;
        return e;
      });
      userRepo.save.mockResolvedValue({
        ...capturedEntity,
        id: 'new-id',
        role: makeRole(),
      });
      userRepo.findOne.mockResolvedValue(makeUser());

      await service.createUser(dto, mockAuditCtx);

      expect(capturedEntity.passwordHash).toBeDefined();
      expect(capturedEntity.passwordHash).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(
        dto.password,
        capturedEntity.passwordHash!,
      );
      expect(isHashed).toBe(true);
    });

    it('throws ConflictException when email is already registered', async () => {
      userRepo.findOne.mockResolvedValueOnce(makeUser()); // email taken
      await expect(service.createUser(dto, mockAuditCtx)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws NotFoundException when roleId does not exist', async () => {
      userRepo.findOne.mockResolvedValueOnce(null); // email unique
      roleRepo.findOne.mockResolvedValue(null); // role not found
      await expect(service.createUser(dto, mockAuditCtx)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listUsers() ────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('returns a paginated list of users', async () => {
      userRepo.findAndCount.mockResolvedValue([[makeUser()], 1]);

      const result = await service.listUsers({ page: 1, limit: 10 });

      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('builds a search filter when the search parameter is provided', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers({ search: 'Alice', page: 1, limit: 10 });

      const [callArgs] = userRepo.findAndCount.mock.calls[0];
      // Should have two where clauses — one for fullName, one for email
      expect(Array.isArray(callArgs.where)).toBe(true);
      expect((callArgs.where as unknown[]).length).toBe(2);
    });

    it('applies companyId and status filters', async () => {
      userRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listUsers({
        companyId: 'company-uuid-1',
        status: UserStatus.ACTIVE,
        page: 1,
        limit: 10,
      });

      const [callArgs] = userRepo.findAndCount.mock.calls[0];
      const whereClause = (callArgs.where as Record<string, unknown>[])[0];
      expect(whereClause['companyId']).toBe('company-uuid-1');
      expect(whereClause['status']).toBe(UserStatus.ACTIVE);
    });
  });

  // ── getUserById() ──────────────────────────────────────────────────────────

  describe('getUserById()', () => {
    it('returns a user when found', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      const result = await service.getUserById('user-uuid-1');
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getUserById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateUser() ───────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    const dto: UpdateUserDto = { fullName: 'Updated Name', phone: '555-1234' };

    it('applies partial updates and writes an audit log', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, ...dto });
      auditRepo.create.mockReturnValue(makeAuditLog());
      auditRepo.save.mockResolvedValue(makeAuditLog());

      const result = await service.updateUser('user-uuid-1', dto, mockAuditCtx);

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.UPDATE }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateUser('non-existent', dto, mockAuditCtx),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteUser() ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('soft-deletes the user and writes an audit log', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.softDelete.mockResolvedValue({ affected: 1 });
      auditRepo.create.mockReturnValue(makeAuditLog());
      auditRepo.save.mockResolvedValue(makeAuditLog());

      await service.deleteUser('user-uuid-1', mockAuditCtx);

      expect(userRepo.softDelete).toHaveBeenCalledWith('user-uuid-1');
      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.DELETE }),
      );
    });

    it('throws ForbiddenException when actor tries to delete themselves', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: 'actor-uuid-1' }));
      await expect(
        service.deleteUser('actor-uuid-1', {
          ...mockAuditCtx,
          actorId: 'actor-uuid-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when deleting the last active admin', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ role: makeRole({ name: 'admin', isSystem: true }) }),
      );
      userRepo.count.mockResolvedValue(1); // only one admin left

      await expect(
        service.deleteUser('user-uuid-1', mockAuditCtx),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteUser('non-existent', mockAuditCtx),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── assignRole() ───────────────────────────────────────────────────────────

  describe('assignRole()', () => {
    const dto: AssignRoleDto = { roleId: 'role-uuid-2' };
    const newRole = makeRole({ id: 'role-uuid-2', name: 'company_owner' });

    it('assigns the new role and writes an audit log', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      roleRepo.findOne.mockResolvedValue(newRole);
      userRepo.save.mockResolvedValue({
        ...makeUser(),
        roleId: 'role-uuid-2',
        role: newRole,
      });
      auditRepo.create.mockReturnValue(makeAuditLog());
      auditRepo.save.mockResolvedValue(makeAuditLog());

      const result = await service.assignRole('user-uuid-1', dto, mockAuditCtx);

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ASSIGN_ROLE }),
      );
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignRole('non-existent', dto, mockAuditCtx),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when roleId does not exist', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      roleRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignRole('user-uuid-1', dto, mockAuditCtx),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── assignCompany() ────────────────────────────────────────────────────────

  describe('assignCompany()', () => {
    const dto: AssignCompanyDto = { companyId: 'company-uuid-2' };

    it('assigns the company and writes an audit log', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.save.mockResolvedValue({
        ...makeUser(),
        companyId: 'company-uuid-2',
      });
      auditRepo.create.mockReturnValue(makeAuditLog());
      auditRepo.save.mockResolvedValue(makeAuditLog());

      await service.assignCompany('user-uuid-1', dto, mockAuditCtx);

      expect(auditRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.ASSIGN_COMPANY }),
      );
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignCompany('non-existent', dto, mockAuditCtx),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getUserActivity() ──────────────────────────────────────────────────────

  describe('getUserActivity()', () => {
    it('returns paginated audit logs for the user', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      auditRepo.findAndCount.mockResolvedValue([[makeAuditLog()], 1]);

      const result = await service.getUserActivity('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].action).toBe(AuditAction.CREATE);
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getUserActivity('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
