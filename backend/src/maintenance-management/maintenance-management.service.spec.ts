import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MaintenanceAssetEntity } from './entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from './entities/maintenance-downtime.entity';
import { MaintenancePlanEntity } from './entities/maintenance-plan.entity';
import { MaintenanceWorkOrderEntity } from './entities/maintenance-work-order.entity';
import { MaintenanceAssetStatus } from './enums/maintenance-asset-status.enum';
import { MaintenanceWorkOrderStatus } from './enums/maintenance-work-order-status.enum';
import { MaintenanceManagementService } from './maintenance-management.service';

describe('MaintenanceManagementService', () => {
  let service: MaintenanceManagementService;

  const assetRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: Partial<MaintenanceAssetEntity>) => value),
    save: jest.fn(async (value: MaintenanceAssetEntity) => value),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
  };

  const planRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: Partial<MaintenancePlanEntity>) => value),
    save: jest.fn(async (value: MaintenancePlanEntity) => value),
    createQueryBuilder: jest.fn(),
  };

  const workOrderRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: Partial<MaintenanceWorkOrderEntity>) => value),
    save: jest.fn(async (value: MaintenanceWorkOrderEntity) => value),
    createQueryBuilder: jest.fn(),
  };

  const downtimeRepository = {
    findOne: jest.fn(),
    create: jest.fn((value: Partial<MaintenanceDowntimeEntity>) => value),
    save: jest.fn(async (value: MaintenanceDowntimeEntity) => value),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceManagementService,
        {
          provide: getRepositoryToken(MaintenanceAssetEntity),
          useValue: assetRepository,
        },
        {
          provide: getRepositoryToken(MaintenancePlanEntity),
          useValue: planRepository,
        },
        {
          provide: getRepositoryToken(MaintenanceWorkOrderEntity),
          useValue: workOrderRepository,
        },
        {
          provide: getRepositoryToken(MaintenanceDowntimeEntity),
          useValue: downtimeRepository,
        },
      ],
    }).compile();

    service = module.get(MaintenanceManagementService);
  });

  it('rejects duplicate active asset code', async () => {
    assetRepository.findOne.mockResolvedValue({
      id: 'asset-1',
      deletedAt: null,
    });

    await expect(
      service.createAsset('company', 'user', {
        assetCode: 'MC-01',
        assetName: 'Machine 1',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects maintenance plan for retired asset', async () => {
    assetRepository.findOne.mockResolvedValue({
      id: 'asset-1',
      companyId: 'company',
      status: MaintenanceAssetStatus.RETIRED,
    });

    await expect(
      service.createPlan('company', 'user', {
        assetId: '11111111-1111-4111-8111-111111111111',
        planName: 'Monthly PM',
        frequency: 'monthly' as never,
        startDate: '2026-08-07',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('requires end after start for downtime', async () => {
    assetRepository.findOne.mockResolvedValue({
      id: 'asset-1',
      companyId: 'company',
      status: MaintenanceAssetStatus.ACTIVE,
    });

    await expect(
      service.createDowntime('company', 'user', {
        assetId: '11111111-1111-4111-8111-111111111111',
        startedAt: '2026-08-07T10:00:00Z',
        endedAt: '2026-08-07T09:00:00Z',
        reason: 'Failure',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires in-progress work order before completion', async () => {
    workOrderRepository.findOne.mockResolvedValue({
      id: 'order-1',
      companyId: 'company',
      status: MaintenanceWorkOrderStatus.OPEN,
    });

    await expect(
      service.completeWorkOrder('company', 'user', 'order-1', {}),
    ).rejects.toThrow(ConflictException);
  });
});
