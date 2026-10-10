import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';

import { ItemEntity } from '../inventory/entities/item.entity';
import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import {
  SalesOrderEntity,
  SalesOrderSyncStatus,
} from '../sales-orders/entities/sales-order.entity';
import { TallyHealthService } from '../tally-sync/tally-health.service';
import { TallySyncService } from '../tally-sync/tally-sync.service';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { MobileService } from './mobile.service';

describe('MobileService', () => {
  let service: MobileService;

  const salesOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const rootSalesOrderRepository = {
    findOne: jest.fn(),
  };

  const salesOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const customerRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
  };

  const itemRepository = {
    find: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const itemQueryBuilder = {
    select: jest.fn(),
    addSelect: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getRawMany: jest.fn(),
  };

  const warehouseRepository = {
    findOne: jest.fn(),
  };

  const transactionManager = {
    getRepository: jest.fn(),
  };

  const dataSource = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    Object.values(itemQueryBuilder).forEach((mock) => {
      mock.mockReturnValue(itemQueryBuilder);
    });

    itemQueryBuilder.getRawMany.mockResolvedValue([]);
    itemRepository.createQueryBuilder.mockReturnValue(itemQueryBuilder);

    transactionManager.getRepository.mockImplementation((entity: unknown) => {
      if (entity === SalesOrderEntity) {
        return salesOrderRepository;
      }

      if (entity === SalesOrderItemEntity) {
        return salesOrderItemRepository;
      }

      throw new Error('Unexpected repository');
    });

    dataSource.transaction.mockImplementation(
      async (
        callback: (manager: typeof transactionManager) => Promise<unknown>,
      ) => callback(transactionManager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        {
          provide: getRepositoryToken(SalesOrderEntity),
          useValue: rootSalesOrderRepository,
        },
        {
          provide: getRepositoryToken(SalesOrderItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: customerRepository,
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: itemRepository,
        },
        {
          provide: getRepositoryToken(WarehouseEntity),
          useValue: warehouseRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: TallySyncService,
          useValue: {},
        },
        {
          provide: TallyHealthService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should load only active company products for mobile transactions', async () => {
    itemQueryBuilder.getRawMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Active product',
        sku: 'ACTIVE-001',
        barcode: null,
        sellingPrice: '12.50',
        stock: '5',
        unit: 'PCS',
      },
    ]);

    const result = await service.getProducts(undefined, 'company-1');

    expect(itemRepository.createQueryBuilder).toHaveBeenCalledWith('item');

    expect(itemQueryBuilder.andWhere).toHaveBeenCalledWith(
      'item.companyId = :companyId',
      { companyId: 'company-1' },
    );

    expect(itemQueryBuilder.andWhere).toHaveBeenCalledWith(
      'item.isActive = :isActive',
      { isActive: true },
    );

    expect(itemQueryBuilder.take).not.toHaveBeenCalled();

    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'product-1',
        name: 'Active product',
        sellingPrice: 12.5,
        stock: 5,
      }),
    ]);
  });

  it('should reject order creation when no active default warehouse exists', async () => {
    customerRepository.findOne.mockResolvedValue({
      id: 'customer-1',
    });

    warehouseRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createSalesOrder(
        {
          customerId: 'customer-1',
          items: [
            {
              productId: 'product-1',
              quantity: 1,
              unitPrice: 10,
            },
          ],
        },
        'company-1',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('should create a mobile order with the active default warehouse inside a transaction', async () => {
    customerRepository.findOne.mockResolvedValue({
      id: 'customer-1',
    });

    warehouseRepository.findOne.mockResolvedValue({
      id: 'warehouse-1',
      companyId: 'company-1',
      isDefault: true,
      isActive: true,
    });

    itemRepository.find.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Button Renamed Test',
        sku: 'TALLY-BUTTON',
        unit: 'PCS',
      },
    ]);

    const createdOrder = {
      id: 'order-1',
      companyId: 'company-1',
      customerId: 'customer-1',
      warehouseId: 'warehouse-1',
      orderNumber: 'SO-TEST-001',
      grandTotal: 10,
      syncStatus: SalesOrderSyncStatus.PENDING,
    };

    salesOrderRepository.create.mockImplementation((value) => value);

    salesOrderRepository.save.mockResolvedValue(createdOrder);

    salesOrderItemRepository.create.mockImplementation((value) => value);

    salesOrderItemRepository.save.mockImplementation((value) =>
      Promise.resolve(value),
    );

    const result = await service.createSalesOrder(
      {
        customerId: 'customer-1',
        items: [
          {
            productId: 'product-1',
            quantity: 1,
            unitPrice: 10,
          },
        ],
        notes: 'test',
      },
      'company-1',
      'user-1',
    );

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);

    expect(salesOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        customerId: 'customer-1',
        warehouseId: 'warehouse-1',
        subtotal: 10,
        taxTotal: 0,
        discountTotal: 0,
        shippingTotal: 0,
        grandTotal: 10,
      }),
    );
    expect(salesOrderItemRepository.save).toHaveBeenCalled();

    expect(salesOrderItemRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        salesOrderId: 'order-1',
        itemId: 'product-1',
        itemName: 'Button Renamed Test',
        sku: 'TALLY-BUTTON',
        quantity: 1,
        deliveredQuantity: 0,
        unit: 'PCS',
        unitPrice: 10,
        discountPercent: 0,
        taxPercent: 0,
        lineSubtotal: 10,
        lineDiscount: 0,
        lineTax: 0,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: 10,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'order-1',
        }),
      }),
    );
  });

  function arrangeValidOrder() {
    customerRepository.findOne.mockResolvedValue({ id: 'customer-1' });
    warehouseRepository.findOne.mockResolvedValue({ id: 'warehouse-1' });
    itemRepository.find.mockResolvedValue([
      { id: 'product-1', name: 'Product', sku: null, unit: 'PCS' },
    ]);
    salesOrderRepository.create.mockImplementation((value) => value);
    salesOrderItemRepository.create.mockImplementation((value) => value);
    salesOrderItemRepository.save.mockImplementation((value) =>
      Promise.resolve(value),
    );
  }

  const orderDto = {
    customerId: 'customer-1',
    items: [{ productId: 'product-1', quantity: 1, unitPrice: 10 }],
  };

  it('should generate distinct order numbers for orders created in the same second', async () => {
    arrangeValidOrder();
    salesOrderRepository.save.mockImplementation((value) =>
      Promise.resolve({
        ...value,
        id: 'order-1',
      }),
    );

    const numbers = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const result = await service.createSalesOrder(
        orderDto,
        'company-1',
        'user-1',
      );
      numbers.add(result.data.orderNumber);
    }

    expect(numbers.size).toBe(20);
    for (const value of numbers) {
      expect(value.length).toBeLessThanOrEqual(50);
    }
  });

  it('should return the existing order when a concurrent retry wins the clientRequestId race', async () => {
    arrangeValidOrder();
    const uniqueViolation = new QueryFailedError('INSERT', [], {
      code: '23505',
      constraint: 'UQ_sales_orders_company_client_request',
    } as unknown as Error);
    salesOrderRepository.save.mockRejectedValue(uniqueViolation);

    rootSalesOrderRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'order-1',
        orderNumber: 'SO-1',
        grandTotal: 10,
        syncStatus: SalesOrderSyncStatus.PENDING,
      });

    const result = await service.createSalesOrder(
      { ...orderDto, clientRequestId: 'req-1' },
      'company-1',
      'user-1',
    );

    expect(result.data.id).toBe('order-1');
    expect(result.message).toBe('Sales order already exists');
  });

  it('should rethrow unrelated unique violations', async () => {
    arrangeValidOrder();
    const uniqueViolation = new QueryFailedError('INSERT', [], {
      code: '23505',
      constraint: 'UQ_sales_orders_company_number',
    } as unknown as Error);
    salesOrderRepository.save.mockRejectedValue(uniqueViolation);
    rootSalesOrderRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createSalesOrder(
        { ...orderDto, clientRequestId: 'req-1' },
        'company-1',
        'user-1',
      ),
    ).rejects.toBe(uniqueViolation);
  });
});
