import { NotFoundException } from '@nestjs/common';

import { UserStatus, type UserEntity } from '../auth/entities/user.entity';
import { PlatformUsersService } from './platform-users.service';

const customerUser = (): UserEntity => ({
  id: 'user-1',
  companyId: 'company-1',
  roleId: 'role-1',
  fullName: 'Customer Admin',
  email: 'customer@example.com',
  passwordHash: 'hash',
  phone: null,
  status: UserStatus.ACTIVE,
  resetTokenHash: null,
  resetTokenExpiresAt: null,
  lastLoginAt: null,
  createdAt: new Date('2026-08-19T10:00:00.000Z'),
  updatedAt: new Date('2026-08-19T10:00:00.000Z'),
  deletedAt: null,
  role: {
    id: 'role-1',
    name: 'admin',
    description: null,
    isSystem: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    users: [],
  },
  company: {
    id: 'company-1',
    name: 'Acme Ltd',
    tallyCompanyName: 'Acme Ltd',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    users: [],
  },
  refreshTokens: [],
});

function buildService(user: UserEntity | null = customerUser()) {
  const qb = {
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([user ? [user] : [], user ? 1 : 0]),
  };
  const userRepository = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn().mockResolvedValue(user),
  };
  const companyRepository = { exists: jest.fn().mockResolvedValue(true) };
  const usersService = {
    listRoles: jest.fn().mockResolvedValue([]),
    createUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
    updateUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
    assignRole: jest.fn().mockResolvedValue({ id: 'user-1' }),
    deleteUser: jest.fn().mockResolvedValue({ message: 'User deleted successfully' }),
    getUserActivity: jest.fn().mockResolvedValue({ data: [], meta: {} }),
  };
  return {
    service: new PlatformUsersService(
      userRepository as any,
      companyRepository as any,
      usersService as any,
    ),
    qb,
    userRepository,
    companyRepository,
    usersService,
  };
}

describe('PlatformUsersService', () => {
  it('lists only customer-company users and maps company/role context', async () => {
    const { service, qb } = buildService();
    await expect(service.list({ page: 1, limit: 50 })).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: 'user-1',
          companyId: 'company-1',
          companyName: 'Acme Ltd',
          roleName: 'admin',
        }),
      ],
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('user.company_id IS NOT NULL');
  });

  it('never exposes a platform account through customer-user detail', async () => {
    const platform = customerUser();
    platform.companyId = null;
    platform.company = null;
    const { service } = buildService(platform);
    await expect(service.get(platform.id)).rejects.toThrow(NotFoundException);
  });

  it('validates the customer company before delegating user creation', async () => {
    const { service, companyRepository, usersService } = buildService();
    const actor = {
      id: 'owner-1',
      email: 'owner@tallysync.com',
      role: 'admin',
      companyId: null,
      fullName: 'Platform Owner',
    } as any;
    await service.create(
      {
        companyId: 'company-1',
        roleId: 'role-1',
        fullName: 'Customer Admin',
        email: 'new@example.com',
        password: 'StrongPass!1',
        status: UserStatus.ACTIVE,
      },
      actor,
    );
    expect(companyRepository.exists).toHaveBeenCalled();
    expect(usersService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-1' }),
      actor,
      undefined,
    );
  });
});
