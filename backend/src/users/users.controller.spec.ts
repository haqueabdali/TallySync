import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserStatus } from './entities/user.entity';
import { AuditAction } from './entities/audit-log.entity';
import { AuditContext } from './interfaces/audit-context.interface';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUsersService = () => ({
  createUser: jest.fn(),
  listUsers: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  assignRole: jest.fn(),
  assignCompany: jest.fn(),
  getUserActivity: jest.fn(),
});

const mockAuditCtx: AuditContext = {
  actorId: 'actor-uuid-1',
  companyId: 'company-uuid-1',
  ipAddress: '127.0.0.1',
  userAgent: 'jest',
};

const userResponse = () => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  fullName: 'Test User',
  email: 'test@example.com',
  phone: null,
  status: UserStatus.ACTIVE,
  role: { id: 'role-uuid-1', name: 'sales_rep', description: null },
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: ReturnType<typeof mockUsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useFactory: mockUsersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createUser ─────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('delegates to UsersService.createUser and returns the result', async () => {
      usersService.createUser.mockResolvedValue(userResponse());

      const dto = {
        companyId: 'company-uuid-1',
        roleId: 'role-uuid-1',
        fullName: 'New User',
        email: 'new@example.com',
        password: 'ValidPass1!',
      };

      const result = await controller.createUser(dto, mockAuditCtx);

      expect(usersService.createUser).toHaveBeenCalledWith(dto, mockAuditCtx);
      expect(result).toEqual(userResponse());
    });
  });

  // ── listUsers ──────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('delegates query params to UsersService.listUsers', async () => {
      const paginatedResponse = {
        data: [userResponse()],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      usersService.listUsers.mockResolvedValue(paginatedResponse);

      const query = { page: 1, limit: 20 };
      const result = await controller.listUsers(query as any);

      expect(usersService.listUsers).toHaveBeenCalledWith(query);
      expect(result.meta.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  // ── getUserById ────────────────────────────────────────────────────────────

  describe('getUserById()', () => {
    it('passes the parsed UUID to UsersService.getUserById', async () => {
      usersService.getUserById.mockResolvedValue(userResponse());

      const result = await controller.getUserById('user-uuid-1');

      expect(usersService.getUserById).toHaveBeenCalledWith('user-uuid-1');
      expect(result.id).toBe('user-uuid-1');
    });
  });

  // ── updateUser ─────────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('passes id, dto, and audit context to UsersService.updateUser', async () => {
      const updated = { ...userResponse(), fullName: 'Updated Name' };
      usersService.updateUser.mockResolvedValue(updated);

      const dto = { fullName: 'Updated Name' };
      const result = await controller.updateUser(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );

      expect(usersService.updateUser).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );
      expect(result.fullName).toBe('Updated Name');
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('calls UsersService.deleteUser with id and audit context', async () => {
      usersService.deleteUser.mockResolvedValue(undefined);

      await controller.deleteUser('user-uuid-1', mockAuditCtx);

      expect(usersService.deleteUser).toHaveBeenCalledWith(
        'user-uuid-1',
        mockAuditCtx,
      );
    });
  });

  // ── assignRole ─────────────────────────────────────────────────────────────

  describe('assignRole()', () => {
    it('delegates to UsersService.assignRole with correct args', async () => {
      const updated = {
        ...userResponse(),
        role: { id: 'role-uuid-2', name: 'company_owner', description: null },
      };
      usersService.assignRole.mockResolvedValue(updated);

      const dto = { roleId: 'role-uuid-2' };
      const result = await controller.assignRole(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );

      expect(usersService.assignRole).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );
      expect(result.role.name).toBe('company_owner');
    });
  });

  // ── assignCompany ──────────────────────────────────────────────────────────

  describe('assignCompany()', () => {
    it('delegates to UsersService.assignCompany', async () => {
      const updated = { ...userResponse(), companyId: 'company-uuid-2' };
      usersService.assignCompany.mockResolvedValue(updated);

      const dto = { companyId: 'company-uuid-2' };
      const result = await controller.assignCompany(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );

      expect(usersService.assignCompany).toHaveBeenCalledWith(
        'user-uuid-1',
        dto,
        mockAuditCtx,
      );
      expect(result.companyId).toBe('company-uuid-2');
    });
  });

  // ── getUserActivity ────────────────────────────────────────────────────────

  describe('getUserActivity()', () => {
    it('calls UsersService.getUserActivity with id, page, and limit', async () => {
      const paginatedLogs = {
        data: [
          {
            id: 'audit-uuid-1',
            action: AuditAction.CREATE,
            entityType: 'user',
            entityId: 'user-uuid-1',
            oldValues: null,
            newValues: null,
            ipAddress: '127.0.0.1',
            createdAt: new Date(),
          },
        ],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };
      usersService.getUserActivity.mockResolvedValue(paginatedLogs);

      const result = await controller.getUserActivity('user-uuid-1', 1, 20);

      expect(usersService.getUserActivity).toHaveBeenCalledWith(
        'user-uuid-1',
        1,
        20,
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe(AuditAction.CREATE);
    });
  });
});
