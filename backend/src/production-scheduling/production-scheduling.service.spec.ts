import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductionScheduleEntity } from './entities/production-schedule.entity';
import { ProductionScheduleStatus } from './enums/production-schedule-status.enum';
import { ProductionSchedulingService } from './production-scheduling.service';

describe('ProductionSchedulingService', () => {
  let service: ProductionSchedulingService;

  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getRawOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };

  const repository = {
    create: jest.fn((value: Partial<ProductionScheduleEntity>) => value),
    save: jest.fn(async (value: ProductionScheduleEntity) => value),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
    qb.orderBy.mockReturnThis();
    qb.addOrderBy.mockReturnThis();
    qb.skip.mockReturnThis();
    qb.take.mockReturnThis();
    qb.withDeleted.mockReturnThis();
    qb.select.mockReturnThis();
    qb.getRawOne.mockResolvedValue(null);
    qb.getCount.mockResolvedValue(0);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionSchedulingService,
        {
          provide: getRepositoryToken(ProductionScheduleEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(ProductionSchedulingService);
  });

  it('rejects an invalid time window', async () => {
    await expect(
      service.create('c', 'u', {
        productionOrderId: '11111111-1111-4111-8111-111111111111',
        plannedStartAt: '2026-08-10T12:00:00Z',
        plannedEndAt: '2026-08-10T08:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents duplicate open schedules for the same production order', async () => {
    qb.getCount.mockResolvedValue(1);

    await expect(
      service.create('c', 'u', {
        productionOrderId: '11111111-1111-4111-8111-111111111111',
        plannedStartAt: '2026-08-10T08:00:00Z',
        plannedEndAt: '2026-08-10T12:00:00Z',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('requires scheduled status before start', async () => {
    repository.findOne.mockResolvedValue({
      id: 's',
      companyId: 'c',
      status: ProductionScheduleStatus.PLANNED,
    });

    await expect(service.start('c', 'u', 's')).rejects.toThrow(
      ConflictException,
    );
  });
});
