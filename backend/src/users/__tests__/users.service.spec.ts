/**
 * src/users/__tests__/users.service.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users.service';
import { UserEntity, UserStatus } from '../entities/user.entity';
import { RoleEntity } from '../entities/role.entity';
import { AuditLogEntity } from '../entities/audit-log.entity';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ListUsersDto } from '../dto/list-users.dto';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

// ── Factories ─────────────────────────────────────────────────────────────────

const ADMIN_ACTOR: AuthenticatedUser = {
  id: 'actor-admin-uuid',
  email: 'admin@test.com',
  role: 'admin',
  companyId: 'company-uuid-1',
  fullName: 'Admin User',
};

const OWNER_ACTOR: AuthenticatedUser = {
  id: 'actor-owner-uuid',
  email: 'owner@test.com',
  role: 'company_owner',
  companyId: 'company-uuid-1',
  fullName: 'Company Owner',
};

const makeRole = (overrides: Partial<RoleEntity> = {}): RoleEntity => ({
  id: 'role-sales-uuid',
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
  roleId: 'role-sales-uuid',
  fullName: 'Test User',
  email: 'test@example.com',
  passwordHash: bcrypt.hashSync('ValidPass1!', 12),
  phone: null,
  status: UserStatus.ACTIVE,
  resetTokenHash: null,
  resetTokenExpiresAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  role: makeRole(),
  refreshTokens: [],
  ...overrides,
});

// ── Mock Repositories ─────────────────────────────────────────────────────────

const mockUserRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn((dto) => ({ ...dto })),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockRoleRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
});

const mockAuditRepo = () => ({
  create: jest.fn((dto) => dto),
  save: jest.fn(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeQb = (users: UserEntity[], total: number) => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([users, total]),
});

// ── Suite ─────────────────────────────────────────────────────────────────────

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
      roleId: 'role-sales-uuid',
      fullName: 'New User',
      email: 'new@example.com',
      password: 'ValidPass1!',
    };

    it('creates and returns a user when all inputs are valid', async () => {
      roleRepo.findOne.mockResolvedValue(makeRole());
      userRepo.findOne
        .mockResolvedValueOnce(null) // email uniqueness check
        .mockResolvedValueOnce(makeUser()); // reload after save
      userRepo.create.mockReturnValue(makeUser());
      userRepo.save.mockResolvedValue(makeUser());
      auditRepo.save.mockResolvedValue({});

      const result = await service.createUser(dto, ADMIN_ACTOR, '127.0.0.1');

      expect(result.email).toBe('test@example.com');
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when roleId does not exist', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.createUser(dto, ADMIN_ACTOR)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      roleRepo.findOne.mockResolvedValue(makeRole());
      userRepo.findOne.mockResolvedValue(makeUser()); // email already exists
      await expect(service.createUser(dto, ADMIN_ACTOR)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException when non-admin creates user in another company', async () => {
      roleRepo.findOne.mockResolvedValue(makeRole());
      const crossCompanyDto = { ...dto, companyId: 'other-company-uuid' };
      await expect(
        service.createUser(crossCompanyDto, OWNER_ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when non-admin tries to assign admin role', async () => {
      roleRepo.findOne.mockResolvedValue(makeRole({ name: 'admin' }));
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.createUser(dto, OWNER_ACTOR)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── listUsers() ────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    const query: ListUsersDto = { page: 1, limit: 20 } as ListUsersDto;

    it('returns paginated users with correct meta', async () => {
      const users = [makeUser(), makeUser({ id: 'user-uuid-2' })];
      userRepo.createQueryBuilder.mockReturnValue(makeQb(users, 2));

      const result = await service.listUsers(query, ADMIN_ACTOR);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
    });

    it('applies company scope for non-admin actors', async () => {
      const qb = makeQb([makeUser()], 1);
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listUsers(query, OWNER_ACTOR);

      expect(qb.andWhere).toHaveBeenCalledWith('user.company_id = :companyId', {
        companyId: OWNER_ACTOR.companyId,
      });
    });

    it('returns empty data when no users found', async () => {
      userRepo.createQueryBuilder.mockReturnValue(makeQb([], 0));
      const result = await service.listUsers(query, ADMIN_ACTOR);
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  // ── getUser() ──────────────────────────────────────────────────────────────

  describe('getUser()', () => {
    it('returns user when found and actor has access', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      const result = await service.getUser('user-uuid-1', ADMIN_ACTOR);
      expect(result.id).toBe('user-uuid-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getUser('non-existent', ADMIN_ACTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when non-admin accesses user in another company', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ companyId: 'other-company-uuid' }),
      );
      await expect(service.getUser('user-uuid-1', OWNER_ACTOR)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateUser() ───────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    const dto: UpdateUserDto = { fullName: 'Updated Name' };

    it('updates and returns user on valid input', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, fullName: 'Updated Name' });
      auditRepo.save.mockResolvedValue({});

      const result = await service.updateUser('user-uuid-1', dto, ADMIN_ACTOR);

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateUser('non-existent', dto, ADMIN_ACTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when non-admin tries to suspend a user', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      await expect(
        service.updateUser(
          'user-uuid-1',
          { status: UserStatus.SUSPENDED },
          OWNER_ACTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows non-admin to update fullName and phone', async () => {
      const user = makeUser();
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockResolvedValue({ ...user, fullName: 'New Name' });
      auditRepo.save.mockResolvedValue({});

      await expect(
        service.updateUser(
          'user-uuid-1',
          { fullName: 'New Name' },
          OWNER_ACTOR,
        ),
      ).resolves.not.toThrow();
    });
  });

  // ── deleteUser() ───────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('soft-deletes a user and returns a success message', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      userRepo.softDelete.mockResolvedValue({});
      userRepo.update.mockResolvedValue({});
      auditRepo.save.mockResolvedValue({});

      const result = await service.deleteUser(
        'user-uuid-1',
        ADMIN_ACTOR,
        '127.0.0.1',
      );

      expect(result.message).toMatch(/deleted successfully/i);
      expect(userRepo.softDelete).toHaveBeenCalledWith('user-uuid-1');
    });

    it('throws BadRequestException when actor tries to self-delete', async () => {
      userRepo.findOne.mockResolvedValue(makeUser({ id: ADMIN_ACTOR.id }));
      await expect(
        service.deleteUser(ADMIN_ACTOR.id, ADMIN_ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(
        service.deleteUser('non-existent', ADMIN_ACTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when non-admin tries to delete an admin', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ role: makeRole({ name: 'admin' }) }),
      );
      await expect(
        service.deleteUser('user-uuid-1', OWNER_ACTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── assignRole() ───────────────────────────────────────────────────────────

  describe('assignRole()', () => {
    const dto: AssignRoleDto = { roleId: 'role-owner-uuid' };

    it('assigns a new role and returns updated user', async () => {
      const user = makeUser();
      const newRole = makeRole({
        id: 'role-owner-uuid',
        name: 'company_owner',
      });

      userRepo.findOne
        .mockResolvedValueOnce(user) // findOrFail
        .mockResolvedValueOnce(
          // reload after save
          makeUser({ roleId: 'role-owner-uuid', role: newRole }),
        );
      roleRepo.findOne.mockResolvedValue(newRole);
      userRepo.save.mockResolvedValue({ ...user, roleId: 'role-owner-uuid' });
      auditRepo.save.mockResolvedValue({});

      const result = await service.assignRole('user-uuid-1', dto, ADMIN_ACTOR);

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(auditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the user already has the target role', async () => {
      // Same roleId on user and dto
      const dto2: AssignRoleDto = { roleId: 'role-sales-uuid' };
      userRepo.findOne.mockResolvedValue(makeUser());
      roleRepo.findOne.mockResolvedValue(makeRole({ id: 'role-sales-uuid' }));

      await service.assignRole('user-uuid-1', dto2, ADMIN_ACTOR);

      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the target role does not exist', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      roleRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignRole('user-uuid-1', dto, ADMIN_ACTOR),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when non-admin tries to assign admin role', async () => {
      userRepo.findOne.mockResolvedValue(makeUser());
      roleRepo.findOne.mockResolvedValue(makeRole({ name: 'admin' }));
      await expect(
        service.assignRole('user-uuid-1', dto, OWNER_ACTOR),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when non-admin tries to remove admin role', async () => {
      userRepo.findOne.mockResolvedValue(
        makeUser({ role: makeRole({ name: 'admin' }) }),
      );
      roleRepo.findOne.mockResolvedValue(makeRole({ name: 'sales_rep' }));
      await expect(
        service.assignRole('user-uuid-1', dto, OWNER_ACTOR),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
