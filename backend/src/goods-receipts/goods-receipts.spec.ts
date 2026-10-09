import { BadRequestException } from '@nestjs/common';

import { GoodsReceiptsService } from './goods-receipts.service';
import { PurchaseOrderStatus } from '../purchase-orders/enums/purchase-order-status.enum';
import {
  InventoryCostSourceType,
  InventoryCostTransactionType,
} from '../inventory-cost-engine';
import { GoodsReceiptStatus } from './enums/goods-receipt-status.enum';

describe('GoodsReceiptsService', () => {
  let service: GoodsReceiptsService;

  const dataSource = {
    transaction: jest.fn(),
  };

  const goodsReceiptRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const goodsReceiptItemRepository = {
    create: jest.fn(),
    delete: jest.fn(),
  };

  const purchaseOrderRepository = {
    findOne: jest.fn(),
  };

  const warehouseRepository = {
    findOne: jest.fn(),
  };

  const inventoryCostEngineService = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GoodsReceiptsService(
      dataSource as any,
      goodsReceiptRepository as any,
      goodsReceiptItemRepository as any,
      purchaseOrderRepository as any,
      warehouseRepository as any,
      inventoryCostEngineService as any,
    );
  });

  describe('purchase order receiving lifecycle', () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const purchaseOrderId = '33333333-3333-4333-8333-333333333333';
    const warehouseId = '44444444-4444-4444-8444-444444444444';
    const purchaseOrderItemId = '55555555-5555-4555-8555-555555555555';
    const itemId = '66666666-6666-4666-8666-666666666666';

    const makePurchaseOrder = (status: PurchaseOrderStatus) => ({
      id: purchaseOrderId,
      companyId,
      warehouseId,
      status,
      items: [
        {
          id: purchaseOrderItemId,
          itemId,
          quantity: 10,
          receivedQuantity: 0,
        },
      ],
    });

    const dto = {
      purchaseOrderId,
      warehouseId,
      grnDate: '2026-09-10',
      remarks: 'Stage6K test',
      items: [
        {
          purchaseOrderItemId,
          itemId,
          receivedQty: 2,
          acceptedQty: 2,
          rejectedQty: 0,
          unitCost: 12.5,
        },
      ],
    };

    it('rejects a draft Purchase Order', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue(
        makePurchaseOrder(PurchaseOrderStatus.DRAFT),
      );

      await expect(
        service.create(dto, companyId, userId),
      ).rejects.toThrow(
        'Goods Receipts can only be created or posted for sent or partially received Purchase Orders.',
      );

      expect(warehouseRepository.findOne).not.toHaveBeenCalled();
      expect(goodsReceiptRepository.save).not.toHaveBeenCalled();
    });

    it('rejects a cancelled Purchase Order', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue(
        makePurchaseOrder(PurchaseOrderStatus.CANCELLED),
      );

      await expect(
        service.create(dto, companyId, userId),
      ).rejects.toThrow(BadRequestException);

      expect(warehouseRepository.findOne).not.toHaveBeenCalled();
    });

    it('allows a sent Purchase Order', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue(
        makePurchaseOrder(PurchaseOrderStatus.SENT),
      );

      warehouseRepository.findOne.mockResolvedValue({
        id: warehouseId,
        companyId,
      });

      goodsReceiptRepository.findOne.mockResolvedValue(null);

      goodsReceiptItemRepository.create.mockImplementation(
        (value: any) => value,
      );

      const createdReceipt = {
        id: '77777777-7777-4777-8777-777777777777',
        companyId,
        purchaseOrderId,
        warehouseId,
        grnNumber: 'GRN-2026-000001',
        grnDate: new Date(dto.grnDate),
        remarks: dto.remarks,
        createdBy: userId,
        updatedBy: null,
        status: 'Draft',
      };

      goodsReceiptRepository.create.mockReturnValue(createdReceipt);

      goodsReceiptRepository.save.mockImplementation(
        async (value: any) => value,
      );

      const result = await service.create(dto, companyId, userId);

      expect(result.purchaseOrderId).toBe(purchaseOrderId);
      expect(result.warehouseId).toBe(warehouseId);

      expect(goodsReceiptRepository.save).toHaveBeenCalledTimes(1);
    });

    it('allows a partially received Purchase Order', async () => {
      purchaseOrderRepository.findOne.mockResolvedValue(
        makePurchaseOrder(PurchaseOrderStatus.PARTIALLY_RECEIVED),
      );

      warehouseRepository.findOne.mockResolvedValue({
        id: warehouseId,
        companyId,
      });

      goodsReceiptRepository.findOne.mockResolvedValue(null);

      goodsReceiptItemRepository.create.mockImplementation(
        (value: any) => value,
      );

      goodsReceiptRepository.create.mockImplementation(
        (value: any) => value,
      );

      goodsReceiptRepository.save.mockImplementation(
        async (value: any) => value,
      );

      await expect(
        service.create(dto, companyId, userId),
      ).resolves.toBeDefined();
    });
  });

  describe('quantity precision', () => {
    it('accepts valid decimal quantities at 4-decimal precision', () => {
      const validateQuantities = (service as any).validateQuantities.bind(
        service,
      );

      expect(() =>
        validateQuantities(
          0.3,
          0.1,
          0.2,
        ),
      ).not.toThrow();

      expect(() =>
        validateQuantities(
          1.2345,
          1.1111,
          0.1234,
        ),
      ).not.toThrow();
    });

    it('rejects accepted plus rejected quantities that do not equal received', () => {
      const validateQuantities = (service as any).validateQuantities.bind(
        service,
      );

      expect(() =>
        validateQuantities(
          5,
          3,
          1,
        ),
      ).toThrow(
        'Accepted quantity plus rejected quantity must equal received quantity.',
      );
    });

    it('rejects zero received quantity', () => {
      const validateQuantities = (service as any).validateQuantities.bind(
        service,
      );

      expect(() =>
        validateQuantities(
          0,
          0,
          0,
        ),
      ).toThrow(
        'Received quantity must be greater than zero.',
      );
    });

    it('rejects negative accepted or rejected quantity', () => {
      const validateQuantities = (service as any).validateQuantities.bind(
        service,
      );

      expect(() =>
        validateQuantities(
          1,
          -1,
          2,
        ),
      ).toThrow(
        'Accepted and rejected quantities cannot be negative.',
      );
    });
  });

  describe('posting inventory effects', () => {
    it('posts received quantity to PO but only accepted quantity to stock and cost', async () => {
      const companyId = '11111111-1111-4111-8111-111111111111';
      const userId = '22222222-2222-4222-8222-222222222222';

      const receiptId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const receiptLineId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

      const purchaseOrderId =
        '33333333-3333-4333-8333-333333333333';
      const purchaseOrderItemId =
        '55555555-5555-4555-8555-555555555555';

      const warehouseId =
        '44444444-4444-4444-8444-444444444444';
      const itemId =
        '66666666-6666-4666-8666-666666666666';

      const receipt: any = {
        id: receiptId,
        companyId,
        purchaseOrderId,
        warehouseId,
        grnNumber: 'GRN-2026-000001',
        grnDate: new Date('2026-09-10T00:00:00.000Z'),
        status: GoodsReceiptStatus.Draft,
        createdBy: userId,
        items: [
          {
            id: receiptLineId,
            goodsReceiptId: receiptId,
            purchaseOrderItemId,
            itemId,
            orderedQty: 10,
            receivedQty: 3,
            acceptedQty: 2,
            rejectedQty: 1,
            unitCost: 12.5,
            remarks: null,
          },
        ],
      };

      const purchaseOrderItem: any = {
        id: purchaseOrderItemId,
        itemId,
        quantity: 10,
        receivedQuantity: 0,
      };

      const purchaseOrder: any = {
        id: purchaseOrderId,
        companyId,
        warehouseId,
        status: PurchaseOrderStatus.SENT,
        items: [purchaseOrderItem],
      };

      const item: any = {
        id: itemId,
        companyId,
        name: 'Stage6K Controlled Item',
        trackInventory: true,
        currentStock: 5,
      };

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(receipt)
          .mockResolvedValueOnce(purchaseOrder)
          .mockResolvedValueOnce(item),

        save: jest.fn(
          async (_entity: unknown, value: unknown) => value,
        ),
      };

      dataSource.transaction.mockImplementation(
        async (callback: any) => callback(manager),
      );

      inventoryCostEngineService.record.mockResolvedValue({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      });

      const result = await service.post(receiptId, companyId, userId);

      // 3 units physically arrived against the PO.
      expect(purchaseOrderItem.receivedQuantity).toBe(3);

      // Only 2 accepted units become usable inventory.
      expect(item.currentStock).toBe(7);

      // Costing must also use only the 2 accepted units.
      expect(inventoryCostEngineService.record).toHaveBeenCalledTimes(1);

      expect(inventoryCostEngineService.record).toHaveBeenCalledWith(
        {
          companyId,
          itemId,
          warehouseId,
          transactionDate: '2026-09-10',
          transactionType: InventoryCostTransactionType.RECEIPT,
          sourceType: InventoryCostSourceType.GOODS_RECEIPT,
          sourceId: receiptId,
          sourceLineId: receiptLineId,
          quantity: 2,
          unitCost: 12.5,
          createdBy: userId,
        },
        {
          manager,
        },
      );

      // 2 accepted × 12.50 = 25.00 inventory value received.
      const costInput =
        inventoryCostEngineService.record.mock.calls[0][0];

      expect(costInput.quantity * costInput.unitCost).toBe(25);

      expect(purchaseOrder.status).toBe(
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
      );

      expect(receipt.status).toBe(GoodsReceiptStatus.Posted);
      expect(result.status).toBe(GoodsReceiptStatus.Posted);
    });

    it('does not create inventory cost when accepted quantity is zero', async () => {
      const companyId = '11111111-1111-4111-8111-111111111111';

      const receipt: any = {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        companyId,
        purchaseOrderId:
          '33333333-3333-4333-8333-333333333333',
        warehouseId:
          '44444444-4444-4444-8444-444444444444',
        grnDate: new Date('2026-09-10T00:00:00.000Z'),
        status: GoodsReceiptStatus.Draft,
        createdBy: null,
        items: [
          {
            id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            purchaseOrderItemId:
              '55555555-5555-4555-8555-555555555555',
            itemId:
              '66666666-6666-4666-8666-666666666666',
            receivedQty: 1,
            acceptedQty: 0,
            rejectedQty: 1,
            unitCost: 12.5,
          },
        ],
      };

      const poItem: any = {
        id: '55555555-5555-4555-8555-555555555555',
        itemId: '66666666-6666-4666-8666-666666666666',
        quantity: 10,
        receivedQuantity: 0,
      };

      const purchaseOrder: any = {
        id: receipt.purchaseOrderId,
        companyId,
        warehouseId: receipt.warehouseId,
        status: PurchaseOrderStatus.SENT,
        items: [poItem],
      };

      const item: any = {
        id: receipt.items[0].itemId,
        companyId,
        name: 'Rejected Item',
        trackInventory: true,
        currentStock: 5,
      };

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(receipt)
          .mockResolvedValueOnce(purchaseOrder)
          .mockResolvedValueOnce(item),

        save: jest.fn(
          async (_entity: unknown, value: unknown) => value,
        ),
      };

      dataSource.transaction.mockImplementation(
        async (callback: any) => callback(manager),
      );

      await service.post(receipt.id, companyId, '22222222-2222-4222-8222-222222222222');

      expect(poItem.receivedQuantity).toBe(1);
      expect(item.currentStock).toBe(5);

      expect(
        inventoryCostEngineService.record,
      ).not.toHaveBeenCalled();

      expect(purchaseOrder.status).toBe(
        PurchaseOrderStatus.PARTIALLY_RECEIVED,
      );
    });
  });


  describe('reversal inventory effects', () => {
    it('reverses accepted stock and warehouse cost while restoring PO received quantity', async () => {
      const companyId = '11111111-1111-4111-8111-111111111111';
      const userId = '22222222-2222-4222-8222-222222222222';

      const receiptId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const receiptLineId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

      const purchaseOrderId =
        '33333333-3333-4333-8333-333333333333';

      const purchaseOrderItemId =
        '55555555-5555-4555-8555-555555555555';

      const warehouseId =
        '44444444-4444-4444-8444-444444444444';

      const itemId =
        '66666666-6666-4666-8666-666666666666';

      const receipt: any = {
        id: receiptId,
        companyId,
        purchaseOrderId,
        warehouseId,
        grnDate: new Date('2026-09-10T00:00:00.000Z'),
        status: GoodsReceiptStatus.Posted,
        items: [
          {
            id: receiptLineId,
            purchaseOrderItemId,
            itemId,
            receivedQty: 3,
            acceptedQty: 2,
            rejectedQty: 1,
            unitCost: 12.5,
          },
        ],
      };

      const poItem: any = {
        id: purchaseOrderItemId,
        itemId,
        quantity: 10,
        receivedQuantity: 3,
      };

      const purchaseOrder: any = {
        id: purchaseOrderId,
        companyId,
        warehouseId,
        status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
        items: [poItem],
      };

      const item: any = {
        id: itemId,
        companyId,
        name: 'Stage6K Controlled Item',
        trackInventory: true,
        currentStock: 7,
      };

      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(receipt)
          .mockResolvedValueOnce(purchaseOrder)
          .mockResolvedValueOnce(item),

        save: jest.fn(
          async (_entity: unknown, value: unknown) => value,
        ),
      };

      dataSource.transaction.mockImplementation(
        async (callback: any) => callback(manager),
      );

      inventoryCostEngineService.record.mockResolvedValue({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      });

      const result = await service.reverse(
        receiptId,
        companyId,
        userId,
      );

      // Only accepted goods had entered inventory.
      expect(item.currentStock).toBe(5);

      // All physically received quantity is removed from PO progress.
      expect(poItem.receivedQuantity).toBe(0);

      expect(inventoryCostEngineService.record).toHaveBeenCalledTimes(1);

      expect(inventoryCostEngineService.record).toHaveBeenCalledWith(
        {
          companyId,
          itemId,
          warehouseId,
          transactionDate: '2026-09-10',
          transactionType: InventoryCostTransactionType.REVERSAL,
          sourceType: InventoryCostSourceType.GOODS_RECEIPT,
          sourceId: receiptId,
          sourceLineId: receiptLineId,
          quantity: 2,
          unitCost: 12.5,
          createdBy: userId,
        },
        {
          manager,
        },
      );

      expect(purchaseOrder.status).toBe(
        PurchaseOrderStatus.SENT,
      );

      expect(receipt.status).toBe(
        GoodsReceiptStatus.Reversed,
      );

      expect(result.status).toBe(
        GoodsReceiptStatus.Reversed,
      );
    });
  });

});
