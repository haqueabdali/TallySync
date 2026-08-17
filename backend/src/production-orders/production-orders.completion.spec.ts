import {
  BadRequestException,
} from '@nestjs/common';
import {
  ProductionOrdersService,
} from './production-orders.service';
import {
  ProductionOrderStatus,
} from './enums/production-order-status.enum';

describe('ProductionOrdersService.complete', () => {
  const companyId =
    '11111111-1111-4111-8111-111111111111';
  const userId =
    '22222222-2222-4222-8222-222222222222';
  const orderId =
    '33333333-3333-4333-8333-333333333333';

  let accountingSettingsRepository: { findOne: jest.Mock };
  let accountingEngineService: { postProductionCompletion: jest.Mock };
  let orderRepository: {
    findOne: jest.Mock;
    exists: jest.Mock;
    update: jest.Mock;
    softRemove: jest.Mock;
  };
  let bomRepository: { findOne: jest.Mock };
  let warehouseRepository: { findOne: jest.Mock };
  let txOrderRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let transactionManager: { getRepository: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let service: ProductionOrdersService;

  const makeOrder = (
    status: ProductionOrderStatus,
    overrides: Record<string, unknown> = {},
  ) => ({
    id: orderId,
    companyId,
    status,
    plannedQuantity: 10,
    completedQuantity: 0,
    actualStartDate: new Date('2026-08-10T08:00:00.000Z'),
    actualEndDate: null,
    actualMaterialCost: 80.125,
    actualLaborCost: 10.115,
    actualOverheadCost: 9.76,
    actualTotalCost: 0,
    updatedBy: userId,
    ...overrides,
  });

  beforeEach(() => {
    accountingSettingsRepository = {
      findOne: jest.fn().mockResolvedValue({
        autoPostProductionCompletion: true,
      }),
    };

    accountingEngineService = {
      postProductionCompletion: jest.fn().mockResolvedValue(undefined),
    };

    orderRepository = {
      findOne: jest.fn(),
      exists: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
    };

    bomRepository = { findOne: jest.fn() };
    warehouseRepository = { findOne: jest.fn() };

    txOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn(async (entity: unknown) => entity),
    };

    transactionManager = {
      getRepository: jest.fn().mockReturnValue(txOrderRepository),
    };

    dataSource = {
      transaction: jest.fn(
        async (
          callback: (
            manager: typeof transactionManager,
          ) => Promise<unknown>,
        ) => callback(transactionManager),
      ),
    };

    service = new ProductionOrdersService(
      accountingSettingsRepository as never,
      accountingEngineService as never,
      orderRepository as never,
      bomRepository as never,
      warehouseRepository as never,
      dataSource as never,
    );

    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: orderId,
      companyId,
      status: ProductionOrderStatus.COMPLETED,
    } as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('completes an in-progress order and posts accounting', async () => {
    const existing = makeOrder(
      ProductionOrderStatus.IN_PROGRESS,
    );
    const locked = makeOrder(
      ProductionOrderStatus.IN_PROGRESS,
    );

    orderRepository.findOne.mockResolvedValueOnce(existing);
    txOrderRepository.findOne.mockResolvedValueOnce(locked);

    await service.complete(orderId, companyId, userId);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);

    expect(txOrderRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orderId, companyId },
        lock: { mode: 'pessimistic_write' },
      }),
    );

    expect(locked.status).toBe(
      ProductionOrderStatus.COMPLETED,
    );
    expect(locked.completedQuantity).toBe(10);
    expect(locked.actualEndDate).toBeInstanceOf(Date);
    expect(locked.actualTotalCost).toBe(100);

    expect(txOrderRepository.save).toHaveBeenCalledWith(locked);

    expect(
      accountingEngineService.postProductionCompletion,
    ).toHaveBeenCalledWith(orderId, companyId, userId);
  });

  it(
    'retries only accounting for an already-completed order',
    async () => {
      orderRepository.findOne.mockResolvedValueOnce(
        makeOrder(ProductionOrderStatus.COMPLETED),
      );

      await service.complete(orderId, companyId, userId);

      expect(dataSource.transaction).not.toHaveBeenCalled();

      expect(
        accountingEngineService.postProductionCompletion,
      ).toHaveBeenCalledWith(orderId, companyId, userId);
    },
  );

  it.each([
    ProductionOrderStatus.DRAFT,
    ProductionOrderStatus.RELEASED,
  ])('rejects completion from %s', async (status) => {
    orderRepository.findOne.mockResolvedValueOnce(
      makeOrder(status),
    );

    await expect(
      service.complete(orderId, companyId, userId),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(
      accountingEngineService.postProductionCompletion,
    ).not.toHaveBeenCalled();
  });

  it(
    'skips accounting when auto-post completion is disabled',
    async () => {
      accountingSettingsRepository.findOne.mockResolvedValueOnce({
        autoPostProductionCompletion: false,
      });

      orderRepository.findOne.mockResolvedValueOnce(
        makeOrder(ProductionOrderStatus.IN_PROGRESS),
      );

      txOrderRepository.findOne.mockResolvedValueOnce(
        makeOrder(ProductionOrderStatus.IN_PROGRESS),
      );

      await service.complete(orderId, companyId, userId);

      expect(txOrderRepository.save).toHaveBeenCalled();
      expect(
        accountingEngineService.postProductionCompletion,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'does not reduce an already-higher completed quantity',
    async () => {
      orderRepository.findOne.mockResolvedValueOnce(
        makeOrder(ProductionOrderStatus.IN_PROGRESS),
      );

      const locked = makeOrder(
        ProductionOrderStatus.IN_PROGRESS,
        {
          plannedQuantity: 10,
          completedQuantity: 12,
        },
      );

      txOrderRepository.findOne.mockResolvedValueOnce(locked);

      await service.complete(orderId, companyId, userId);

      expect(locked.completedQuantity).toBe(12);
    },
  );
});