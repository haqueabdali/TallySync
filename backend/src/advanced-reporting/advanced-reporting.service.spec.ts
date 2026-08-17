import {
  BadRequestException,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { CapacityPlanningService } from '../capacity-planning/capacity-planning.service';
import { MaintenanceAssetEntity } from '../maintenance-management/entities/maintenance-asset.entity';
import { MaintenanceDowntimeEntity } from '../maintenance-management/entities/maintenance-downtime.entity';
import { MaintenanceWorkOrderEntity } from '../maintenance-management/entities/maintenance-work-order.entity';
import { ProductionScheduleEntity } from '../production-scheduling/entities/production-schedule.entity';
import { QualityInspectionEntity } from '../quality-management/entities/quality-inspection.entity';
import { AdvancedReportingService } from './advanced-reporting.service';

describe('AdvancedReportingService', () => {
  let service:
    AdvancedReportingService;

  const repository = {
    createQueryBuilder:
      jest.fn(),
    count:
      jest.fn().mockResolvedValue(0),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AdvancedReportingService,
          {
            provide:
              getRepositoryToken(
                ProductionScheduleEntity,
              ),
            useValue: repository,
          },
          {
            provide:
              getRepositoryToken(
                QualityInspectionEntity,
              ),
            useValue: repository,
          },
          {
            provide:
              getRepositoryToken(
                MaintenanceAssetEntity,
              ),
            useValue: repository,
          },
          {
            provide:
              getRepositoryToken(
                MaintenanceWorkOrderEntity,
              ),
            useValue: repository,
          },
          {
            provide:
              getRepositoryToken(
                MaintenanceDowntimeEntity,
              ),
            useValue: repository,
          },
          {
            provide:
              CapacityPlanningService,
            useValue: {
              getCapacityReport:
                jest.fn(),
            },
          },
        ],
      }).compile();

    service =
      module.get(
        AdvancedReportingService,
      );
  });

  it('rejects a reversed report range', async () => {
    await expect(
      service.getDashboard(
        'company',
        {
          dateFrom: '2026-08-31',
          dateTo: '2026-08-01',
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects a range over 366 days', async () => {
    await expect(
      service.getProductionPerformance(
        'company',
        {
          dateFrom: '2026-01-01',
          dateTo: '2027-01-03',
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });
});
