import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { CapacityPlanningService } from './capacity-planning.service';
import { WorkCenterCapacityOverrideEntity } from './entities/work-center-capacity-override.entity';
import { WorkCenterEntity } from './entities/work-center.entity';

describe('CapacityPlanningService', () => {
  let service: CapacityPlanningService;

  const workCenterRepository = {
    create: jest.fn(
      (value: Partial<WorkCenterEntity>) => value,
    ),
    save: jest.fn(
      async (value: WorkCenterEntity) => value,
    ),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
  };

  const overrideQuery = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const overrideRepository = {
    create: jest.fn(
      (
        value: Partial<WorkCenterCapacityOverrideEntity>,
      ) => value,
    ),
    save: jest.fn(
      async (
        value: WorkCenterCapacityOverrideEntity,
      ) => value,
    ),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(
      () => overrideQuery,
    ),
  };

  const scheduleQuery = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const scheduleRepository = {
    createQueryBuilder: jest.fn(
      () => scheduleQuery,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    overrideQuery.where.mockReturnThis();
    overrideQuery.andWhere.mockReturnThis();
    overrideQuery.getMany.mockResolvedValue([]);

    scheduleQuery.where.mockReturnThis();
    scheduleQuery.andWhere.mockReturnThis();
    scheduleQuery.getMany.mockResolvedValue([]);

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          CapacityPlanningService,
          {
            provide: getRepositoryToken(
              WorkCenterEntity,
            ),
            useValue: workCenterRepository,
          },
          {
            provide: getRepositoryToken(
              WorkCenterCapacityOverrideEntity,
            ),
            useValue: overrideRepository,
          },
          {
            provide: getRepositoryToken(
              ProductionScheduleEntity,
            ),
            useValue: scheduleRepository,
          },
        ],
      }).compile();

    service = module.get(CapacityPlanningService);
  });

  it('rejects duplicate active work center codes', async () => {
    workCenterRepository.findOne.mockResolvedValue({
      id: 'existing',
      deletedAt: null,
    });

    await expect(
      service.createWorkCenter('company', 'user', {
        code: 'WC-01',
        name: 'Assembly',
        dailyCapacityMinutes: 480,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects reversed report date ranges', async () => {
    await expect(
      service.getCapacityReport('company', {
        dateFrom: '2026-08-10',
        dateTo: '2026-08-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects report ranges longer than one year', async () => {
    await expect(
      service.getCapacityReport('company', {
        dateFrom: '2026-01-01',
        dateTo: '2027-01-03',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
