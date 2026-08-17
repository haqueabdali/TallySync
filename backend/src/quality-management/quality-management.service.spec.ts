import {
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { QualityInspectionCheckEntity } from './entities/quality-inspection-check.entity';
import { QualityInspectionEntity } from './entities/quality-inspection.entity';
import { QualityCheckResult } from './enums/quality-check-result.enum';
import { QualityInspectionSourceType } from './enums/quality-inspection-source-type.enum';
import { QualityInspectionStatus } from './enums/quality-inspection-status.enum';
import { QualityManagementService } from './quality-management.service';

describe('QualityManagementService', () => {
  let service: QualityManagementService;

  const inspectionRepository = {
    findOne: jest.fn(),
    save: jest.fn(
      async (
        value: QualityInspectionEntity,
      ) => value,
    ),
    createQueryBuilder: jest.fn(),
  };

  const checkRepository = {
    save: jest.fn(
      async (
        value: QualityInspectionCheckEntity,
      ) => value,
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          QualityManagementService,
          {
            provide:
              getRepositoryToken(
                QualityInspectionEntity,
              ),
            useValue:
              inspectionRepository,
          },
          {
            provide:
              getRepositoryToken(
                QualityInspectionCheckEntity,
              ),
            useValue:
              checkRepository,
          },
          {
            provide: DataSource,
            useValue: {
              transaction:
                jest.fn(),
            },
          },
        ],
      }).compile();

    service =
      module.get(
        QualityManagementService,
      );
  });

  it('requires sourceId for production inspections', async () => {
    await expect(
      service.create(
        'company',
        'user',
        {
          inspectionDate:
            '2026-08-07',
          sourceType:
            QualityInspectionSourceType.PRODUCTION,
          inspectedQuantity: 10,
          checks: [
            {
              checkName: 'Visual',
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents duplicate check names', async () => {
    await expect(
      service.create(
        'company',
        'user',
        {
          inspectionDate:
            '2026-08-07',
          sourceType:
            QualityInspectionSourceType.MANUAL,
          inspectedQuantity: 10,
          checks: [
            {
              checkName: 'Visual',
            },
            {
              checkName: ' visual ',
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not complete while mandatory checks are pending', async () => {
    inspectionRepository.findOne.mockResolvedValue(
      {
        id: 'inspection',
        companyId: 'company',
        status:
          QualityInspectionStatus.IN_PROGRESS,
        inspectedQuantity: 10,
        checks: [
          {
            isMandatory: true,
            result:
              QualityCheckResult.PENDING,
          },
        ],
      },
    );

    await expect(
      service.complete(
        'company',
        'user',
        'inspection',
        {
          acceptedQuantity: 10,
          rejectedQuantity: 0,
        },
      ),
    ).rejects.toThrow(
      ConflictException,
    );
  });

  it('requires accepted plus rejected to equal inspected quantity', async () => {
    inspectionRepository.findOne.mockResolvedValue(
      {
        id: 'inspection',
        companyId: 'company',
        status:
          QualityInspectionStatus.IN_PROGRESS,
        inspectedQuantity: 10,
        checks: [
          {
            isMandatory: true,
            result:
              QualityCheckResult.PASS,
          },
        ],
      },
    );

    await expect(
      service.complete(
        'company',
        'user',
        'inspection',
        {
          acceptedQuantity: 8,
          rejectedQuantity: 1,
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });
});
