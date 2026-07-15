/**
 * src/users/__tests__/users.controller.spec.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { UserStatus } from '../entities/user.entity';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { AssignRoleDto } from '../dto/assign-role.dto';
import { ListUsersDto } from '../dto/list-users.dto';

const mockUsersService = () => ({
  createUser: jest.fn(),
  listUsers: jest.fn(),
  listRoles: jest.fn(),
  getUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  assignRole: jest.fn(),
});

const ADMIN_ACTOR: AuthenticatedUser = {
  id: 'actor-uuid',
  email: 'admin@test.com',
  role: 'admin',
  companyId: 'company-uuid-1',
  fullName: 'Admin',
};

const mockRequest = (ip = '127.0.0.1') =>
  ({
    headers: { 'user-agent': 'jest' },
    socket: { remoteAddress: ip },
  } as any);

const stubUser = () => ({
  id: 'user-uuid-1',
  companyId: 'company-uuid-1',
  fullName: 'Test User',
  email: 'test@example.com',
  phone: null,
  status: UserStatus.ACTIVE,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: { id: 'r1', name: 'sales_rep', description: null },
});

describe('UsersController', () => {
  let controller: UsersController;
  let service: ReturnType<typeof mockUsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useFactory: mockUsersService },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── listUsers ──────────────────────────────────────────────────────────────

  describe('listUsers()', () => {
    it('delegates to UsersService.listUsers() and returns result', async () => {
      const paginated = { data: [stubUser()], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } };
      service.listUsers.mockResolvedValue(paginated);

      const result = await controller.listUsers({} as ListUsersDto, ADMIN_ACTOR);

      expect(service.listUsers).toHaveBeenCalledWith({}, ADMIN_ACTOR);
      expect(result.meta.total).toBe(1);
    });
  });

  // ── listRoles ──────────────────────────────────────────────────────────────

  describe('listRoles()', () => {
    it('returns role list from service', async () => {
      service.listRoles.mockResolvedValue([{ id: 'r1', name: 'admin' }]);
      const result = await controller.listRoles();
      expect(result).toHaveLength(1);
    });
  });

  // ── getUser ────────────────────────────────────────────────────────────────

  describe('getUser()', () => {
    it('calls UsersService.getUser() with id and actor', async () => {
      service.getUser.mockResolvedValue(stubUser());
      const result = await controller.getUser('user-uuid-1', ADMIN_ACTOR);
      expect(service.getUser).toHaveBeenCalledWith('user-uuid-1', ADMIN_ACTOR);
      expect(result.id).toBe('user-uuid-1');
    });
  });

  // ── createUser ─────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('calls UsersService.createUser() with dto, actor, and extracted IP', async () => {
      service.createUser.mockResolvedValue(stubUser());
      const dto: CreateUserDto = {
        companyId: 'company-uuid-1',
        roleId: 'role-uuid-1',
        fullName: 'New User',
        email: 'new@example.com',
        password: 'ValidPass1!',
      };

      const result = await controller.createUser(dto, ADMIN_ACTOR, mockRequest());

      expect(service.createUser).toHaveBeenCalledWith(dto, ADMIN_ACTOR, '127.0.0.1');
      expect(result).toBeDefined();
    });

    it('extracts the first IP from x-forwarded-for header', async () => {
      service.createUser.mockResolvedValue(stubUser());
      const req = { headers: { 'x-forwarded-for': '10.0.0.1, 192.168.0.1' }, socket: {} } as any;
      await controller.createUser({} as any, ADMIN_ACTOR, req);
      expect(service.createUser).toHaveBeenCalledWith(
        expect.anything(), expect.anything(), '10.0.0.1',
      );
    });
  });

  // ── updateUser ─────────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('calls UsersService.updateUser() and returns updated user', async () => {
      const updated = { ...stubUser(), fullName: 'Updated' };
      service.updateUser.mockResolvedValue(updated);
      const dto: UpdateUserDto = { fullName: 'Updated' };

      const result = await controller.updateUser('user-uuid-1', dto, ADMIN_ACTOR, mockRequest());

      expect(service.updateUser).toHaveBeenCalledWith(
        'user-uuid-1', dto, ADMIN_ACTOR, '127.0.0.1',
      );
      expect(result.fullName).toBe('Updated');
    });
  });

  // ── deleteUser ─────────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('calls UsersService.deleteUser() and returns message', async () => {
      service.deleteUser.mockResolvedValue({ message: 'User deleted successfully' });
      const result = await controller.deleteUser('user-uuid-1', ADMIN_ACTOR, mockRequest());
      expect(service.deleteUser).toHaveBeenCalledWith('user-uuid-1', ADMIN_ACTOR, '127.0.0.1');
      expect(result.message).toMatch(/deleted/i);
    });
  });

  // ── assignRole ─────────────────────────────────────────────────────────────

  describe('assignRole()', () => {
    it('calls UsersService.assignRole() and returns updated user', async () => {
      const updated = { ...stubUser(), role: { id: 'r2', name: 'company_owner', description: null } };
      service.assignRole.mockResolvedValue(updated);
      const dto: AssignRoleDto = { roleId: 'role-owner-uuid' };

      const result = await controller.assignRole('user-uuid-1', dto, ADMIN_ACTOR, mockRequest());

      expect(service.assignRole).toHaveBeenCalledWith(
        'user-uuid-1', dto, ADMIN_ACTOR, '127.0.0.1',
      );
      expect(result.role.name).toBe('company_owner');
    });
  });
});
