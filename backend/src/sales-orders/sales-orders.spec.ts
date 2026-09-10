import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../items/entities/item.entity';
import { SalesQuotationItem } from '../sales-quotations/entities/sales-quotation-item.entity';
import { SalesQuotation } from '../sales-quotations/entities/sales-quotation.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { SalesOrderItemEntity } from './entities/sales-order-item.entity';
import { SalesOrderEntity } from './entities/sales-order.entity';
import { SalesOrdersService } from './sales-orders.service';
import { SalesOrderStatus } from './enums/sales-order-status.enum';

describe('SalesOrdersService', () => {
  let service: SalesOrdersService;
  let salesOrderRepository: jest.Mocked<Repository<SalesOrderEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalesOrderEntity),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SalesOrderItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(WarehouseEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesQuotation),
          useValue: {},
        },
        {
          provide: getRepositoryToken(SalesQuotationItem),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SalesOrdersService>(SalesOrdersService);
    salesOrderRepository = module.get(getRepositoryToken(SalesOrderEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('fulfill', () => {
    const orderId = '11111111-1111-4111-8111-111111111111';
    const companyId = '22222222-2222-4222-8222-222222222222';
    const userId = '33333333-3333-4333-8333-333333333333';

    const makeOrder = (status: SalesOrderStatus): SalesOrderEntity =>
      ({
        id: orderId,
        companyId,
        customerId: '44444444-4444-4444-8444-444444444444',
        warehouseId: null,
        salesQuotationId: null,
        orderNumber: 'SO-TEST-001',
        orderDate: '2026-08-29',
        expectedDeliveryDate: null,
        status,
        currency: 'EUR',
        subtotal: 100,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: 0,
        grandTotal: 100,
        customerReference: null,
        shippingAddress: null,
        notes: null,
        items: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            quantity: 1,
            unitPrice: 100,
            discountPercent: 0,
            taxPercent: 0,
            lineSubtotal: 100,
            discountAmount: 0,
            taxAmount: 0,
            lineTotal: 100,
          } as SalesOrderItemEntity,
        ],
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date('2026-08-29T00:00:00.000Z'),
        updatedAt: new Date('2026-08-29T00:00:00.000Z'),
        deletedAt: null,
      }) as SalesOrderEntity;

    it.each([
      SalesOrderStatus.Submitted,
      SalesOrderStatus.Confirmed,
      SalesOrderStatus.Delivered,
    ])(
      'should fulfill an order from %s',
      async (initialStatus: SalesOrderStatus) => {
        const order = makeOrder(initialStatus);

        salesOrderRepository.findOne.mockResolvedValue(order);
        salesOrderRepository.save.mockImplementation(async (entity) => entity);

        const result = await service.fulfill(orderId, companyId, userId);

        expect(order.status).toBe(SalesOrderStatus.Fulfilled);
        expect(order.updatedBy).toBe(userId);

        expect(salesOrderRepository.save).toHaveBeenCalledWith(order);

        expect(result.status).toBe(SalesOrderStatus.Fulfilled);
      },
    );

    it('should be idempotent when the order is already fulfilled', async () => {
      const order = makeOrder(SalesOrderStatus.Fulfilled);

      salesOrderRepository.findOne.mockResolvedValue(order);

      const result = await service.fulfill(orderId, companyId, userId);

      expect(result.status).toBe(SalesOrderStatus.Fulfilled);
      expect(salesOrderRepository.save).not.toHaveBeenCalled();
    });

    it.each([
      SalesOrderStatus.Draft,
      SalesOrderStatus.PartiallyDelivered,
      SalesOrderStatus.Cancelled,
    ])(
      'should reject fulfillment from %s',
      async (initialStatus: SalesOrderStatus) => {
        const order = makeOrder(initialStatus);

        salesOrderRepository.findOne.mockResolvedValue(order);

        await expect(
          service.fulfill(orderId, companyId, userId),
        ).rejects.toBeInstanceOf(ConflictException);

        expect(salesOrderRepository.save).not.toHaveBeenCalled();
      },
    );
  });
});
