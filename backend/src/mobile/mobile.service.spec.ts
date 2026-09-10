import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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
          useValue: {},
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

    salesOrderItemRepository.save.mockImplementation(async (value) => value);

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
});
