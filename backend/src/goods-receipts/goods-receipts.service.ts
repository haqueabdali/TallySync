import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';

import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseOrderItemEntity } from '../purchase-orders/entities/purchase-order-item.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderStatus } from '../purchase-orders/enums/purchase-order-status.enum';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GoodsReceiptFilterDto } from './dto/goods-receipt-filter.dto';
import {
  GoodsReceiptResponseDto,
  PaginatedGoodsReceiptsResponseDto,
} from './dto/goods-receipt-response.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptStatus } from './enums/goods-receipt-status.enum';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,

    @InjectRepository(GoodsReceiptItem)
    private readonly goodsReceiptItemRepository: Repository<GoodsReceiptItem>,

    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrderRepository: Repository<PurchaseOrderEntity>,

    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,
  ) {}

  private async generateGrnNumber(companyId: string): Promise<string> {
    const year = new Date().getFullYear();

    const last = await this.goodsReceiptRepository.findOne({
      where: {
        companyId,
        grnNumber: ILike(`GRN-${year}-%`),
      },
      order: { createdAt: 'DESC' },
      withDeleted: true,
    });

    const current = last ? Number(last.grnNumber.split('-').pop()) : 0;
    const next = Number.isFinite(current) ? current + 1 : 1;

    return `GRN-${year}-${String(next).padStart(6, '0')}`;
  }

  private validateQuantities(
    receivedQty: number,
    acceptedQty: number,
    rejectedQty: number,
  ): void {
    if (receivedQty <= 0) {
      throw new BadRequestException('Received quantity must be greater than zero.');
    }

    if (acceptedQty < 0 || rejectedQty < 0) {
      throw new BadRequestException(
        'Accepted and rejected quantities cannot be negative.',
      );
    }

    if (acceptedQty + rejectedQty !== receivedQty) {
      throw new BadRequestException(
        'Accepted quantity plus rejected quantity must equal received quantity.',
      );
    }
  }

  private buildReceiptItems(
    dto: CreateGoodsReceiptDto | UpdateGoodsReceiptDto,
    purchaseOrder: PurchaseOrderEntity,
    goodsReceiptId?: string,
  ): GoodsReceiptItem[] {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one Goods Receipt item is required.');
    }

    const duplicateIds = dto.items
      .map((item) => item.purchaseOrderItemId)
      .filter((id, index, values) => values.indexOf(id) !== index);

    if (duplicateIds.length > 0) {
      throw new BadRequestException(
        'A Purchase Order item cannot appear more than once in a Goods Receipt.',
      );
    }

    return dto.items.map((itemDto) => {
      this.validateQuantities(
        Number(itemDto.receivedQty),
        Number(itemDto.acceptedQty),
        Number(itemDto.rejectedQty),
      );

      const purchaseOrderItem = purchaseOrder.items.find(
        (item) => item.id === itemDto.purchaseOrderItemId,
      );

      if (!purchaseOrderItem) {
        throw new BadRequestException(
          `Purchase Order item ${itemDto.purchaseOrderItemId} was not found in this Purchase Order.`,
        );
      }

      if (purchaseOrderItem.itemId !== itemDto.itemId) {
        throw new BadRequestException(
          `Item ${itemDto.itemId} does not match Purchase Order item ${itemDto.purchaseOrderItemId}.`,
        );
      }

      const remainingQty =
        Number(purchaseOrderItem.quantity) -
        Number(purchaseOrderItem.receivedQuantity ?? 0);

      if (Number(itemDto.receivedQty) > remainingQty) {
        throw new BadRequestException(
          `Received quantity for item ${itemDto.itemId} exceeds the remaining Purchase Order quantity (${remainingQty}).`,
        );
      }

      return this.goodsReceiptItemRepository.create({
        ...(goodsReceiptId ? { goodsReceiptId } : {}),
        purchaseOrderItemId: purchaseOrderItem.id,
        itemId: purchaseOrderItem.itemId,
        orderedQty: Number(purchaseOrderItem.quantity),
        receivedQty: Number(itemDto.receivedQty),
        acceptedQty: Number(itemDto.acceptedQty),
        rejectedQty: Number(itemDto.rejectedQty),
        unitCost: Number(itemDto.unitCost),
        remarks: itemDto.remarks ?? null,
      });
    });
  }

  async create(
    dto: CreateGoodsReceiptDto,
    companyId: string,
    userId: string,
  ): Promise<GoodsReceiptResponseDto> {
    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: dto.purchaseOrderId, companyId },
      relations: ['items'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException(
        'A Goods Receipt cannot be created for a cancelled Purchase Order.',
      );
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('This Purchase Order is already fully received.');
    }

    const warehouse = await this.warehouseRepository.findOne({
      where: { id: dto.warehouseId, companyId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    if (purchaseOrder.warehouseId !== dto.warehouseId) {
      throw new BadRequestException(
        'The Goods Receipt warehouse must match the Purchase Order warehouse.',
      );
    }

    const receipt = this.goodsReceiptRepository.create({
      companyId,
      purchaseOrderId: purchaseOrder.id,
      warehouseId: warehouse.id,
      grnNumber: await this.generateGrnNumber(companyId),
      grnDate: new Date(dto.grnDate),
      remarks: dto.remarks ?? null,
      createdBy: userId,
      updatedBy: null,
      status: GoodsReceiptStatus.Draft,
    });

    receipt.items = this.buildReceiptItems(dto, purchaseOrder);

    return this.goodsReceiptRepository.save(receipt);
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<GoodsReceiptResponseDto> {
    const receipt = await this.goodsReceiptRepository.findOne({
      where: { id, companyId },
      relations: ['items'],
    });

    if (!receipt) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    return receipt;
  }

  async findAll(
    filter: GoodsReceiptFilterDto,
    companyId: string,
  ): Promise<PaginatedGoodsReceiptsResponseDto> {
    const page = Math.max(1, Number(filter.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(filter.limit ?? 10) || 10));

    const query = this.goodsReceiptRepository
      .createQueryBuilder('receipt')
      .leftJoinAndSelect('receipt.items', 'items')
      .where('receipt.companyId = :companyId', { companyId });

    if (filter.status) {
      query.andWhere('receipt.status = :status', { status: filter.status });
    }

    if (filter.warehouseId) {
      query.andWhere('receipt.warehouseId = :warehouseId', {
        warehouseId: filter.warehouseId,
      });
    }

    if (filter.purchaseOrderId) {
      query.andWhere('receipt.purchaseOrderId = :purchaseOrderId', {
        purchaseOrderId: filter.purchaseOrderId,
      });
    }

    if (filter.search?.trim()) {
      query.andWhere('receipt.grnNumber ILIKE :search', {
        search: `%${filter.search.trim()}%`,
      });
    }

    if (filter.fromDate) {
      query.andWhere('receipt.grnDate >= :fromDate', {
        fromDate: filter.fromDate,
      });
    }

    if (filter.toDate) {
      query.andWhere('receipt.grnDate <= :toDate', {
        toDate: filter.toDate,
      });
    }

    const [data, total] = await query
      .orderBy('receipt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    dto: UpdateGoodsReceiptDto,
    companyId: string,
    userId: string,
  ): Promise<GoodsReceiptResponseDto> {
    const receipt = await this.goodsReceiptRepository.findOne({
      where: { id, companyId },
      relations: ['items'],
    });

    if (!receipt) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    if (receipt.status !== GoodsReceiptStatus.Draft) {
      throw new BadRequestException('Only draft Goods Receipts can be updated.');
    }

    if (dto.purchaseOrderId && dto.purchaseOrderId !== receipt.purchaseOrderId) {
      throw new BadRequestException(
        'The Purchase Order cannot be changed after a Goods Receipt is created.',
      );
    }

    const purchaseOrder = await this.purchaseOrderRepository.findOne({
      where: { id: receipt.purchaseOrderId, companyId },
      relations: ['items'],
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase Order not found.');
    }

    if (dto.warehouseId) {
      const warehouse = await this.warehouseRepository.findOne({
        where: { id: dto.warehouseId, companyId },
      });

      if (!warehouse) {
        throw new NotFoundException('Warehouse not found.');
      }

      if (purchaseOrder.warehouseId !== dto.warehouseId) {
        throw new BadRequestException(
          'The Goods Receipt warehouse must match the Purchase Order warehouse.',
        );
      }

      receipt.warehouseId = dto.warehouseId;
    }

    if (dto.grnDate) {
      receipt.grnDate = new Date(dto.grnDate);
    }

    if (dto.remarks !== undefined) {
      receipt.remarks = dto.remarks ?? null;
    }

    receipt.updatedBy = userId;

    if (dto.items) {
      await this.goodsReceiptItemRepository.delete({ goodsReceiptId: receipt.id });
      receipt.items = this.buildReceiptItems(dto, purchaseOrder, receipt.id);
    }

    return this.goodsReceiptRepository.save(receipt);
  }

  async remove(id: string, companyId: string): Promise<void> {
    const receipt = await this.goodsReceiptRepository.findOne({
      where: { id, companyId },
    });

    if (!receipt) {
      throw new NotFoundException('Goods Receipt not found.');
    }

    if (receipt.status !== GoodsReceiptStatus.Draft) {
      throw new BadRequestException('Only draft Goods Receipts can be deleted.');
    }

    await this.goodsReceiptRepository.softRemove(receipt);
  }

  async post(
    id: string,
    companyId: string,
  ): Promise<GoodsReceiptResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const receipt = await manager.findOne(GoodsReceipt, {
        where: { id, companyId },
        relations: ['items'],
      });

      if (!receipt) {
        throw new NotFoundException('Goods Receipt not found.');
      }

      if (receipt.status !== GoodsReceiptStatus.Draft) {
        throw new BadRequestException('Only draft Goods Receipts can be posted.');
      }

      const purchaseOrder = await manager.findOne(PurchaseOrderEntity, {
        where: { id: receipt.purchaseOrderId, companyId },
        relations: ['items'],
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Purchase Order not found.');
      }

      for (const line of receipt.items) {
        const purchaseOrderItem = purchaseOrder.items.find(
          (item) => item.id === line.purchaseOrderItemId,
        );

        if (!purchaseOrderItem) {
          throw new BadRequestException(
            `Purchase Order item ${line.purchaseOrderItemId} was not found.`,
          );
        }

        const remainingQty =
          Number(purchaseOrderItem.quantity) -
          Number(purchaseOrderItem.receivedQuantity ?? 0);

        if (Number(line.receivedQty) > remainingQty) {
          throw new BadRequestException(
            `Received quantity for item ${line.itemId} exceeds the remaining Purchase Order quantity (${remainingQty}).`,
          );
        }

        const item = await manager.findOne(ItemEntity, {
          where: { id: line.itemId, companyId },
        });

        if (!item) {
          throw new NotFoundException(`Item ${line.itemId} not found.`);
        }

        if (item.trackInventory) {
          item.currentStock =
            Number(item.currentStock ?? 0) + Number(line.acceptedQty);
          await manager.save(ItemEntity, item);
        }

        purchaseOrderItem.receivedQuantity =
          Number(purchaseOrderItem.receivedQuantity ?? 0) +
          Number(line.receivedQty);

        await manager.save(PurchaseOrderItemEntity, purchaseOrderItem);
      }

      const fullyReceived = purchaseOrder.items.every(
        (item) =>
          Number(item.receivedQuantity ?? 0) >= Number(item.quantity),
      );

      const partiallyReceived = purchaseOrder.items.some(
        (item) => Number(item.receivedQuantity ?? 0) > 0,
      );

      purchaseOrder.status = fullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : partiallyReceived
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : purchaseOrder.status;

      await manager.save(PurchaseOrderEntity, purchaseOrder);

      receipt.status = GoodsReceiptStatus.Posted;
      return manager.save(GoodsReceipt, receipt);
    });
  }

  async reverse(
    id: string,
    companyId: string,
  ): Promise<GoodsReceiptResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const receipt = await manager.findOne(GoodsReceipt, {
        where: { id, companyId },
        relations: ['items'],
      });

      if (!receipt) {
        throw new NotFoundException('Goods Receipt not found.');
      }

      if (receipt.status !== GoodsReceiptStatus.Posted) {
        throw new BadRequestException('Only posted Goods Receipts can be reversed.');
      }

      const purchaseOrder = await manager.findOne(PurchaseOrderEntity, {
        where: { id: receipt.purchaseOrderId, companyId },
        relations: ['items'],
      });

      if (!purchaseOrder) {
        throw new NotFoundException('Purchase Order not found.');
      }

      for (const line of receipt.items) {
        const item = await manager.findOne(ItemEntity, {
          where: { id: line.itemId, companyId },
        });

        if (!item) {
          throw new NotFoundException(`Item ${line.itemId} not found.`);
        }

        const acceptedQty = Number(line.acceptedQty);
        const currentStock = Number(item.currentStock ?? 0);

        if (item.trackInventory && currentStock < acceptedQty) {
          throw new BadRequestException(
            `Cannot reverse GRN because stock for item "${item.name}" would become negative.`,
          );
        }

        if (item.trackInventory) {
          item.currentStock = currentStock - acceptedQty;
          await manager.save(ItemEntity, item);
        }

        const purchaseOrderItem = purchaseOrder.items.find(
          (poItem) => poItem.id === line.purchaseOrderItemId,
        );

        if (!purchaseOrderItem) {
          throw new BadRequestException(
            `Purchase Order item ${line.purchaseOrderItemId} was not found.`,
          );
        }

        purchaseOrderItem.receivedQuantity = Math.max(
          0,
          Number(purchaseOrderItem.receivedQuantity ?? 0) -
            Number(line.receivedQty),
        );

        await manager.save(PurchaseOrderItemEntity, purchaseOrderItem);
      }

      const fullyReceived = purchaseOrder.items.every(
        (item) =>
          Number(item.receivedQuantity ?? 0) >= Number(item.quantity),
      );

      const partiallyReceived = purchaseOrder.items.some(
        (item) => Number(item.receivedQuantity ?? 0) > 0,
      );

      purchaseOrder.status = fullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : partiallyReceived
          ? PurchaseOrderStatus.PARTIALLY_RECEIVED
          : PurchaseOrderStatus.SENT;

      await manager.save(PurchaseOrderEntity, purchaseOrder);

      receipt.status = GoodsReceiptStatus.Reversed;
      return manager.save(GoodsReceipt, receipt);
    });
  }
}
