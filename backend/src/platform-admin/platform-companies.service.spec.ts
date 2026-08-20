import { ConflictException, NotFoundException } from '@nestjs/common';

import { CompanyEntity } from '../auth/entities/company.entity';
import { LicensePlan } from '../licensing/enums/license-plan.enum';
import { LicenseStatus } from '../licensing/enums/license-status.enum';
import { PlatformCompaniesService } from './platform-companies.service';

const makeCompany = (
  overrides: Partial<CompanyEntity> = {},
): CompanyEntity => ({
  id: 'company-1',
  name: 'Acme Ltd',
  tallyCompanyName: 'Acme Ltd',
  isActive: true,
  createdAt: new Date('2026-08-18T10:00:00.000Z'),
  updatedAt: new Date('2026-08-18T10:00:00.000Z'),
  deletedAt: null,
  users: [],
  ...overrides,
});

function buildService(
  options: {
    companies?: CompanyEntity[];
    companyExists?: boolean;
    duplicateName?: boolean;
    licenses?: any[];
    userRows?: Array<{ companyId: string; activeUsers: string }>;
  } = {},
) {
  const companies = options.companies ?? [makeCompany()];
  const companyQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([companies, companies.length]),
    getExists: jest.fn().mockResolvedValue(options.duplicateName ?? false),
  };
  const companyRepository = {
    createQueryBuilder: jest.fn(() => companyQueryBuilder),
    findOne: jest
      .fn()
      .mockResolvedValue(
        options.companyExists === false ? null : (companies[0] ?? null),
      ),
    create: jest.fn((value) => ({
      id: 'company-created',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      users: [],
      ...value,
    })),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const userQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(options.userRows ?? []),
  };
  const userRepository = {
    createQueryBuilder: jest.fn(() => userQueryBuilder),
  };
  const licenseRepository = {
    find: jest.fn().mockResolvedValue(options.licenses ?? []),
  };

  return {
    service: new PlatformCompaniesService(
      companyRepository as any,
      userRepository as any,
      licenseRepository as any,
    ),
    companyRepository,
    companyQueryBuilder,
  };
}

describe('PlatformCompaniesService', () => {
  it('lists companies with active-user and license summaries', async () => {
    const company = makeCompany();
    const license = {
      id: 'license-1',
      companyId: company.id,
      licenseNumber: 'TS-1',
      plan: LicensePlan.BUSINESS,
      status: LicenseStatus.ACTIVE,
      maxUsers: 25,
      maxConcurrentUsers: 10,
      expiresAt: null,
      certificateIssuedAt: null,
    };
    const { service } = buildService({
      companies: [company],
      licenses: [license],
      userRows: [{ companyId: company.id, activeUsers: '3' }],
    });

    await expect(service.list({ page: 1, limit: 20 })).resolves.toEqual({
      data: [
        expect.objectContaining({
          id: company.id,
          activeUsers: 3,
          license: expect.objectContaining({
            id: license.id,
            plan: LicensePlan.BUSINESS,
          }),
        }),
      ],
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('creates an active company and defaults the Tally name', async () => {
    const context = buildService({ companies: [] });
    context.companyRepository.findOne.mockImplementation(({ where }: any) =>
      Promise.resolve(
        where.id
          ? makeCompany({
              id: where.id,
              name: 'New Company',
              tallyCompanyName: 'New Company',
            })
          : null,
      ),
    );

    await expect(
      context.service.create({ name: 'New Company' }),
    ).resolves.toMatchObject({
      name: 'New Company',
      tallyCompanyName: 'New Company',
      isActive: true,
    });
    expect(context.companyRepository.create).toHaveBeenCalledWith({
      name: 'New Company',
      tallyCompanyName: 'New Company',
      isActive: true,
    });
  });

  it('updates the customer company activation state', async () => {
    const company = makeCompany();
    const context = buildService({ companies: [company] });

    await expect(
      context.service.update(company.id, { isActive: false }),
    ).resolves.toMatchObject({ id: company.id, isActive: false });
    expect(context.companyRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: company.id, isActive: false }),
    );
  });

  it('rejects a duplicate live company name', async () => {
    const { service } = buildService({ duplicateName: true });

    await expect(service.create({ name: 'Acme Ltd' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects updates for a missing company', async () => {
    const { service } = buildService({ companyExists: false });

    await expect(
      service.update('missing-company', { isActive: false }),
    ).rejects.toThrow(NotFoundException);
  });
});
