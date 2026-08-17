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

import { CostingVarianceService } from './costing-variance.service';
import { ProductionCostAnalysisEntity } from './entities/production-cost-analysis.entity';
import { ProductionCostMaterialLineEntity } from './entities/production-cost-material-line.entity';
import { CostingAnalysisStatus } from './enums/costing-analysis-status.enum';

describe('CostingVarianceService', () => {
  let service:
    CostingVarianceService;

  const analysisRepository = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn(
      async (
        value:
          ProductionCostAnalysisEntity,
      ) => value,
    ),
    createQueryBuilder:
      jest.fn(),
  };

  const materialRepository = {
    create: jest.fn(
      (
        value: Partial<ProductionCostMaterialLineEntity>,
      ) => value,
    ),
    save: jest.fn(
      async (
        value:
          ProductionCostMaterialLineEntity[],
      ) => value,
    ),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          CostingVarianceService,
          {
            provide:
              getRepositoryToken(
                ProductionCostAnalysisEntity,
              ),
            useValue:
              analysisRepository,
          },
          {
            provide:
              getRepositoryToken(
                ProductionCostMaterialLineEntity,
              ),
            useValue:
              materialRepository,
          },
          {
            provide:
              DataSource,
            useValue: {
              transaction:
                jest.fn(),
            },
          },
        ],
      }).compile();

    service =
      module.get(
        CostingVarianceService,
      );
  });

  it('prevents duplicate active production reference', async () => {
    analysisRepository.findOne.mockResolvedValue(
      {
        id: 'analysis',
        deletedAt: null,
      },
    );

    await expect(
      service.create(
        'company',
        'user',
        {
          productionReferenceId:
            '11111111-1111-4111-8111-111111111111',
          analysisDate:
            '2026-08-07',
          plannedOutputQuantity: 10,
          actualOutputQuantity: 10,
          materialLines: [
            {
              itemId:
                '22222222-2222-4222-8222-222222222222',
              standardQuantity: 5,
              actualQuantity: 5,
              standardUnitCost: 2,
              actualUnitCost: 2,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      ConflictException,
    );
  });

  it('prevents duplicate material items', async () => {
    analysisRepository.findOne.mockResolvedValue(
      null,
    );

    await expect(
      service.create(
        'company',
        'user',
        {
          productionReferenceId:
            '11111111-1111-4111-8111-111111111111',
          analysisDate:
            '2026-08-07',
          plannedOutputQuantity: 10,
          actualOutputQuantity: 10,
          materialLines: [
            {
              itemId:
                '22222222-2222-4222-8222-222222222222',
              standardQuantity: 5,
              actualQuantity: 5,
              standardUnitCost: 2,
              actualUnitCost: 2,
            },
            {
              itemId:
                '22222222-2222-4222-8222-222222222222',
              standardQuantity: 1,
              actualQuantity: 1,
              standardUnitCost: 1,
              actualUnitCost: 1,
            },
          ],
        },
      ),
    ).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requires actual output before finalization', async () => {
    analysisRepository.findOne.mockResolvedValue(
      {
        id: 'analysis',
        companyId: 'company',
        status:
          CostingAnalysisStatus.DRAFT,
        actualOutputQuantity: 0,
        materialLines: [{}],
      },
    );

    await expect(
      service.finalize(
        'company',
        'user',
        'analysis',
      ),
    ).rejects.toThrow(
      ConflictException,
    );
  });
});
