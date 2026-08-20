import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../licensing/guards/platform-admin.guard';
import { PlatformCompaniesController } from './platform-companies.controller';
import { PlatformCompaniesService } from './platform-companies.service';

describe('PlatformCompaniesController', () => {
  let controller: PlatformCompaniesController;
  const service = {
    list: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformCompaniesController],
      providers: [{ provide: PlatformCompaniesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PlatformAdminGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(PlatformCompaniesController);
  });

  it('lists companies through the platform service', async () => {
    const query = { page: 1, limit: 20 };
    service.list.mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1,
    });
    await expect(controller.list(query)).resolves.toMatchObject({ total: 0 });
    expect(service.list).toHaveBeenCalledWith(query);
  });

  it('creates a customer company', async () => {
    const dto = {
      name: 'Acme Ltd',
      tallyCompanyName: 'Acme Ltd',
      isActive: true,
    };
    service.create.mockResolvedValue({ id: 'company-1', ...dto });
    await expect(controller.create(dto)).resolves.toMatchObject({
      name: 'Acme Ltd',
    });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('loads a commercial company summary', async () => {
    service.findOne.mockResolvedValue({ id: 'company-1', name: 'Acme Ltd' });
    await expect(controller.get('company-1')).resolves.toMatchObject({
      id: 'company-1',
    });
    expect(service.findOne).toHaveBeenCalledWith('company-1');
  });

  it('updates company activation state', async () => {
    service.update.mockResolvedValue({ id: 'company-1', isActive: false });
    await expect(
      controller.update('company-1', { isActive: false }),
    ).resolves.toMatchObject({ isActive: false });
    expect(service.update).toHaveBeenCalledWith('company-1', {
      isActive: false,
    });
  });
});
