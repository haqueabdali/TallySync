import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  Repository,
} from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptStatus } from '../goods-receipts/enums/goods-receipt-status.enum';
import { ItemEntity } from '../items/entities/item.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { PurchaseReturnFilterDto } from './dto/purchase-return-filter.dto';
import {
  PaginatedPurchaseReturnsResponseDto,
  PurchaseReturnItemResponseDto,
  PurchaseReturnResponseDto,
} from './dto/purchase-return-response.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';
import { PurchaseReturnItem } from './entities/purchase-return-item.entity';
import { PurchaseReturn } from './entities/purchase-return.entity';
import { PurchaseReturnStatus } from './enums/purchase-return-status.enum';
import { PurchaseInvoiceItemEntity } from '../purchase-invoices/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';


@Injectable()
export class PurchaseReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(PurchaseReturn)
    private readonly returnRepository: Repository<PurchaseReturn>,

    @InjectRepository(PurchaseReturnItem)
    private readonly returnItemRepository: Repository<PurchaseReturnItem>,

    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,

    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,

    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,

    @InjectRepository(PurchaseInvoiceItemEntity)
    private readonly purchaseInvoiceItemRepository: Repository<PurchaseInvoiceItemEntity>,

    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,

    @InjectRepository(GoodsReceiptItem)
    private readonly goodsReceiptItemRepository: Repository<GoodsReceiptItem>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreatePurchaseReturnDto,
    companyId: string,
    userId: string,
  ): Promise<PurchaseReturnResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(PurchaseReturn);
      const itemRepository = manager.getRepository(PurchaseReturnItem);

      const purchaseReturn = returnRepository.create({
        companyId,
        supplierId: dto.supplierId,
        warehouseId: dto.warehouseId,
        purchaseInvoiceId: dto.purchaseInvoiceId ?? null,
        goodsReceiptId: dto.goodsReceiptId ?? null,
        returnNumber: await this.generateReturnNumber(
          companyId,
          dto.returnDate,
        ),
        returnDate: dto.returnDate,
        status: PurchaseReturnStatus.Draft,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        reason: this.optional(dto.reason),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        items: [],
      });

      const savedReturn = await returnRepository.save(purchaseReturn);

      savedReturn.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitPrice,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return itemRepository.create({
          purchaseReturnId: savedReturn.id,
          itemId: line.itemId,
          purchaseInvoiceItemId:
            line.purchaseInvoiceItemId ?? null,
          goodsReceiptItemId:
            line.goodsReceiptItemId ?? null,
          description: this.optional(line.description),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedReturn.items = await itemRepository.save(savedReturn.items);
      this.calculateReturnTotals(savedReturn);

      return this.toResponse(
        await returnRepository.save(savedReturn),
      );
    });
  }

  async findAll(
    filter: PurchaseReturnFilterDto,
    companyId: string,
  ): Promise<PaginatedPurchaseReturnsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.returnRepository
      .createQueryBuilder('purchaseReturn')
      .leftJoinAndSelect('purchaseReturn.items', 'items')
      .where('purchaseReturn.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where(
            'purchaseReturn.return_number ILIKE :search',
            { search },
          )
            .orWhere('purchaseReturn.reason ILIKE :search', {
              search,
            })
            .orWhere('purchaseReturn.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.supplierId) {
      query.andWhere(
        'purchaseReturn.supplier_id = :supplierId',
        { supplierId: filter.supplierId },
      );
    }

    if (filter.warehouseId) {
      query.andWhere(
        'purchaseReturn.warehouse_id = :warehouseId',
        { warehouseId: filter.warehouseId },
      );
    }

    if (filter.purchaseInvoiceId) {
      query.andWhere(
        'purchaseReturn.purchase_invoice_id = :purchaseInvoiceId',
        { purchaseInvoiceId: filter.purchaseInvoiceId },
      );
    }

    if (filter.goodsReceiptId) {
      query.andWhere(
        'purchaseReturn.goods_receipt_id = :goodsReceiptId',
        { goodsReceiptId: filter.goodsReceiptId },
      );
    }

    if (filter.status) {
      query.andWhere('purchaseReturn.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere(
        'purchaseReturn.return_date >= :dateFrom',
        { dateFrom: filter.dateFrom },
      );
    }

    if (filter.dateTo) {
      query.andWhere(
        'purchaseReturn.return_date <= :dateTo',
        { dateTo: filter.dateTo },
      );
    }

    const sortColumns: Record<string, string> = {
      returnNumber: 'purchaseReturn.return_number',
      returnDate: 'purchaseReturn.return_date',
      grandTotal: 'purchaseReturn.grand_total',
      createdAt: 'purchaseReturn.created_at',
      updatedAt: 'purchaseReturn.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ??
          'purchaseReturn.created_at',
        filter.sortOrder,
      )
      .addOrderBy('purchaseReturn.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [returns, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: returns.map((purchaseReturn) =>
        this.toResponse(purchaseReturn),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdatePurchaseReturnDto,
    companyId: string,
    userId: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(PurchaseReturn);
      const itemRepository = manager.getRepository(PurchaseReturnItem);

      const purchaseReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!purchaseReturn) {
        throw new NotFoundException('Purchase return not found.');
      }

      this.ensureDraft(purchaseReturn);

      const mergedDto: CreatePurchaseReturnDto = {
        supplierId: dto.supplierId ?? purchaseReturn.supplierId,
        warehouseId: dto.warehouseId ?? purchaseReturn.warehouseId,
        purchaseInvoiceId:
          dto.purchaseInvoiceId ??
          purchaseReturn.purchaseInvoiceId ??
          undefined,
        goodsReceiptId:
          dto.goodsReceiptId ??
          purchaseReturn.goodsReceiptId ??
          undefined,
        returnDate: dto.returnDate ?? purchaseReturn.returnDate,
        currency: dto.currency ?? purchaseReturn.currency,
        reason: dto.reason ?? purchaseReturn.reason ?? undefined,
        notes: dto.notes ?? purchaseReturn.notes ?? undefined,
        items:
          dto.items ??
          purchaseReturn.items.map((item) => ({
            itemId: item.itemId,
            purchaseInvoiceItemId:
              item.purchaseInvoiceItemId ?? undefined,
            goodsReceiptItemId:
              item.goodsReceiptItemId ?? undefined,
            description: item.description ?? undefined,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discountPercent: Number(item.discountPercent),
            taxPercent: Number(item.taxPercent),
          })),
      };

      await this.validateReferences(mergedDto, companyId);

      if (dto.items) {
        this.ensureUniqueItems(dto.items.map((item) => item.itemId));

        await itemRepository.delete({
          purchaseReturnId: purchaseReturn.id,
        });

        purchaseReturn.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitPrice,
            line.discountPercent ?? 0,
            line.taxPercent ?? 0,
          );

          return itemRepository.create({
            purchaseReturnId: purchaseReturn.id,
            itemId: line.itemId,
            purchaseInvoiceItemId:
              line.purchaseInvoiceItemId ?? null,
            goodsReceiptItemId:
              line.goodsReceiptItemId ?? null,
            description: this.optional(line.description),
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        purchaseReturn.items = await itemRepository.save(
          purchaseReturn.items,
        );
      }

      if (dto.supplierId !== undefined) {
        purchaseReturn.supplierId = dto.supplierId;
      }

      if (dto.warehouseId !== undefined) {
        purchaseReturn.warehouseId = dto.warehouseId;
      }

      if (dto.purchaseInvoiceId !== undefined) {
        purchaseReturn.purchaseInvoiceId =
          dto.purchaseInvoiceId ?? null;
      }

      if (dto.goodsReceiptId !== undefined) {
        purchaseReturn.goodsReceiptId =
          dto.goodsReceiptId ?? null;
      }

      if (dto.returnDate !== undefined) {
        purchaseReturn.returnDate = dto.returnDate;
      }

      if (dto.currency !== undefined) {
        purchaseReturn.currency = dto.currency.toUpperCase();
      }

      if (dto.reason !== undefined) {
        purchaseReturn.reason = this.optional(dto.reason);
      }

      if (dto.notes !== undefined) {
        purchaseReturn.notes = this.optional(dto.notes);
      }

      purchaseReturn.updatedBy = userId;
      this.calculateReturnTotals(purchaseReturn);

      return this.toResponse(
        await returnRepository.save(purchaseReturn),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(PurchaseReturn);
      const itemRepository = manager.getRepository(ItemEntity);
      const supplierRepository = manager.getRepository(SupplierEntity);

      const purchaseReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!purchaseReturn) {
        throw new NotFoundException('Purchase return not found.');
      }

      this.ensureDraft(purchaseReturn);

      if (!purchaseReturn.items.length) {
        throw new BadRequestException(
          'Purchase return must contain at least one item.',
        );
      }

      await this.validateReturnQuantities(
        purchaseReturn,
        companyId,
      );

      for (const line of purchaseReturn.items) {
        const item = await itemRepository.findOne({
          where: {
            id: line.itemId,
            companyId,
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Item ${line.itemId} not found.`,
          );
        }

        const currentStock = Number(item.currentStock ?? 0);
        const returnQuantity = Number(line.quantity);

        if (currentStock < returnQuantity) {
          throw new ConflictException(
            `Insufficient stock for item ${item.name}.`,
          );
        }

        item.currentStock = this.roundStock(
          currentStock - returnQuantity,
        );

        await itemRepository.save(item);
      }

      const supplier = await supplierRepository.findOne({
        where: {
          id: purchaseReturn.supplierId,
          companyId,
        },
      });

      if (!supplier) {
        throw new NotFoundException('Supplier not found.');
      }

      supplier.currentBalance = this.round(
        Number(supplier.currentBalance ?? 0) -
          Number(purchaseReturn.grandTotal),
      );

      await supplierRepository.save(supplier);

      purchaseReturn.status = PurchaseReturnStatus.Posted;
      purchaseReturn.updatedBy = userId;

      return this.toResponse(
        await returnRepository.save(purchaseReturn),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(PurchaseReturn);
      const itemRepository = manager.getRepository(ItemEntity);
      const supplierRepository = manager.getRepository(SupplierEntity);

      const purchaseReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!purchaseReturn) {
        throw new NotFoundException('Purchase return not found.');
      }

      if (purchaseReturn.status === PurchaseReturnStatus.Cancelled) {
        return this.toResponse(purchaseReturn);
      }

      if (purchaseReturn.status === PurchaseReturnStatus.Posted) {
        for (const line of purchaseReturn.items) {
          const item = await itemRepository.findOne({
            where: {
              id: line.itemId,
              companyId,
            },
          });

          if (!item) {
            throw new NotFoundException(
              `Item ${line.itemId} not found.`,
            );
          }

          item.currentStock = this.roundStock(
            Number(item.currentStock ?? 0) +
              Number(line.quantity),
          );

          await itemRepository.save(item);
        }

        const supplier = await supplierRepository.findOne({
          where: {
            id: purchaseReturn.supplierId,
            companyId,
          },
        });

        if (!supplier) {
          throw new NotFoundException('Supplier not found.');
        }

        supplier.currentBalance = this.round(
          Number(supplier.currentBalance ?? 0) +
            Number(purchaseReturn.grandTotal),
        );

        await supplierRepository.save(supplier);
      }

      purchaseReturn.status = PurchaseReturnStatus.Cancelled;
      purchaseReturn.updatedBy = userId;

      return this.toResponse(
        await returnRepository.save(purchaseReturn),
      );
    });
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const purchaseReturn = await this.getEntity(id, companyId);
    this.ensureDraft(purchaseReturn);

    await this.returnRepository.softRemove(purchaseReturn);

    return {
      message: 'Purchase return deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreatePurchaseReturnDto,
    companyId: string,
  ): Promise<void> {
    const supplier = await this.supplierRepository.findOne({
      where: {
        id: dto.supplierId,
        companyId,
      },
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found.');
    }

    const warehouse = await this.warehouseRepository.findOne({
      where: {
        id: dto.warehouseId,
        companyId,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    if (dto.purchaseInvoiceId) {
      const invoice = await this.purchaseInvoiceRepository.findOne({
        where: {
          id: dto.purchaseInvoiceId,
          companyId,
          supplierId: dto.supplierId,
        },
      });

      if (!invoice) {
        throw new NotFoundException(
          'Purchase invoice not found.',
        );
      }

      if (
        invoice.status !== PurchaseInvoiceStatus.Posted &&
        invoice.status !== PurchaseInvoiceStatus.Paid
      ) {
        throw new ConflictException(
          'Only posted or paid invoices can be returned.',
        );
      }
    }

    if (dto.goodsReceiptId) {
      const goodsReceipt = await this.goodsReceiptRepository.findOne({
        where: {
          id: dto.goodsReceiptId,
          companyId,
          warehouseId: dto.warehouseId,
        },
      });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods Receipt not found.',
        );
      }

      if (goodsReceipt.status !== GoodsReceiptStatus.Posted) {
        throw new ConflictException(
          'Only posted Goods Receipts can be returned.',
        );
      }
    }

    for (const line of dto.items) {
      const item = await this.itemRepository.findOne({
        where: {
          id: line.itemId,
          companyId,
        },
      });

      if (!item) {
        throw new NotFoundException(
          `Item ${line.itemId} not found.`,
        );
      }

      if (line.purchaseInvoiceItemId) {
        const invoiceLine =
          await this.purchaseInvoiceItemRepository.findOne({
            where: {
              id: line.purchaseInvoiceItemId,
              itemId: line.itemId,
            },
          });

        if (!invoiceLine) {
          throw new BadRequestException(
            `Purchase invoice item ${line.purchaseInvoiceItemId} is invalid.`,
          );
        }

        if (
          dto.purchaseInvoiceId &&
          invoiceLine.purchaseInvoiceId !== dto.purchaseInvoiceId
        ) {
          throw new BadRequestException(
            'Purchase invoice item does not belong to the selected invoice.',
          );
        }
      }

      if (line.goodsReceiptItemId) {
        const receiptLine =
          await this.goodsReceiptItemRepository.findOne({
            where: {
              id: line.goodsReceiptItemId,
              itemId: line.itemId,
            },
          });

        if (!receiptLine) {
          throw new BadRequestException(
            `Goods Receipt item ${line.goodsReceiptItemId} is invalid.`,
          );
        }

        if (
          dto.goodsReceiptId &&
          receiptLine.goodsReceiptId !== dto.goodsReceiptId
        ) {
          throw new BadRequestException(
            'Goods Receipt item does not belong to the selected receipt.',
          );
        }
      }
    }
  }

  private async validateReturnQuantities(
    purchaseReturn: PurchaseReturn,
    companyId: string,
  ): Promise<void> {
    for (const line of purchaseReturn.items) {
      let sourceQuantity: number | null = null;

      if (line.purchaseInvoiceItemId) {
        const invoiceLine =
          await this.purchaseInvoiceItemRepository.findOne({
            where: {
              id: line.purchaseInvoiceItemId,
              itemId: line.itemId,
            },
          });

        if (!invoiceLine) {
          throw new NotFoundException(
            `Purchase invoice item ${line.purchaseInvoiceItemId} not found.`,
          );
        }

        sourceQuantity = Number(invoiceLine.quantity);
      }

      if (line.goodsReceiptItemId) {
        const receiptLine =
          await this.goodsReceiptItemRepository.findOne({
            where: {
              id: line.goodsReceiptItemId,
              itemId: line.itemId,
            },
          });

        if (!receiptLine) {
          throw new NotFoundException(
            `Goods Receipt item ${line.goodsReceiptItemId} not found.`,
          );
        }

        const acceptedQuantity = Number(receiptLine.acceptedQty);
        sourceQuantity =
          sourceQuantity === null
            ? acceptedQuantity
            : Math.min(sourceQuantity, acceptedQuantity);
      }

      if (sourceQuantity === null) {
        continue;
      }

      const previousQuery = this.returnItemRepository
        .createQueryBuilder('returnItem')
        .innerJoin(
          PurchaseReturn,
          'purchaseReturn',
          'purchaseReturn.id = returnItem.purchase_return_id',
        )
        .select(
          'COALESCE(SUM(returnItem.quantity), 0)',
          'returnedQuantity',
        )
        .where('purchaseReturn.company_id = :companyId', {
          companyId,
        })
        .andWhere('purchaseReturn.status = :postedStatus', {
          postedStatus: PurchaseReturnStatus.Posted,
        })
        .andWhere('purchaseReturn.id != :currentReturnId', {
          currentReturnId: purchaseReturn.id,
        });

      if (line.purchaseInvoiceItemId) {
        previousQuery.andWhere(
          'returnItem.purchase_invoice_item_id = :invoiceItemId',
          { invoiceItemId: line.purchaseInvoiceItemId },
        );
      } else if (line.goodsReceiptItemId) {
        previousQuery.andWhere(
          'returnItem.goods_receipt_item_id = :receiptItemId',
          { receiptItemId: line.goodsReceiptItemId },
        );
      } else {
        previousQuery.andWhere('returnItem.item_id = :itemId', {
          itemId: line.itemId,
        });
      }

      const previous = await previousQuery.getRawOne<{
        returnedQuantity?: string;
      }>();

      const alreadyReturned = Number(
        previous?.returnedQuantity ?? 0,
      );
      const requestedQuantity = Number(line.quantity);
      const remainingQuantity =
        sourceQuantity - alreadyReturned;

      if (requestedQuantity > remainingQuantity) {
        throw new BadRequestException(
          `Return quantity for item ${line.itemId} exceeds the remaining returnable quantity.`,
        );
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<PurchaseReturn> {
    const purchaseReturn = await this.returnRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!purchaseReturn) {
      throw new NotFoundException('Purchase return not found.');
    }

    return purchaseReturn;
  }

  private ensureDraft(purchaseReturn: PurchaseReturn): void {
    if (purchaseReturn.status !== PurchaseReturnStatus.Draft) {
      throw new ConflictException(
        'Only draft purchase returns can be modified.',
      );
    }
  }

  private ensureUniqueItems(itemIds: string[]): void {
    if (new Set(itemIds).size !== itemIds.length) {
      throw new BadRequestException(
        'Duplicate items are not allowed.',
      );
    }
  }

  private calculateLine(
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    taxPercent: number,
  ): Pick<
    PurchaseReturnItem,
    'lineSubtotal' | 'discountAmount' | 'taxAmount' | 'lineTotal'
  > {
    const lineSubtotal = this.round(quantity * unitPrice);
    const discountAmount = this.round(
      lineSubtotal * (discountPercent / 100),
    );
    const taxableAmount = this.round(
      lineSubtotal - discountAmount,
    );
    const taxAmount = this.round(
      taxableAmount * (taxPercent / 100),
    );
    const lineTotal = this.round(taxableAmount + taxAmount);

    return {
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  private calculateReturnTotals(
    purchaseReturn: PurchaseReturn,
  ): void {
    purchaseReturn.subtotal = this.round(
      purchaseReturn.items.reduce(
        (sum, item) => sum + Number(item.lineSubtotal),
        0,
      ),
    );

    purchaseReturn.discountTotal = this.round(
      purchaseReturn.items.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0,
      ),
    );

    purchaseReturn.taxTotal = this.round(
      purchaseReturn.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    purchaseReturn.grandTotal = this.round(
      purchaseReturn.subtotal -
        purchaseReturn.discountTotal +
        purchaseReturn.taxTotal,
    );
  }

  private async generateReturnNumber(
    companyId: string,
    returnDate: string,
  ): Promise<string> {
    const year = new Date(returnDate).getUTCFullYear();
    const prefix = `PRET-${year}-`;

    const latest = await this.returnRepository
      .createQueryBuilder('purchaseReturn')
      .withDeleted()
      .select(
        'purchaseReturn.return_number',
        'returnNumber',
      )
      .where('purchaseReturn.company_id = :companyId', {
        companyId,
      })
      .andWhere(
        'purchaseReturn.return_number LIKE :prefix',
        { prefix: `${prefix}%` },
      )
      .orderBy('purchaseReturn.return_number', 'DESC')
      .getRawOne<{ returnNumber?: string }>();

    const current = latest?.returnNumber
      ? Number(latest.returnNumber.replace(prefix, ''))
      : 0;

    return `${prefix}${String(current + 1).padStart(6, '0')}`;
  }

  private optional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private roundStock(value: number): number {
    return (
      Math.round((value + Number.EPSILON) * 10000) / 10000
    );
  }

  private toItemResponse(
    item: PurchaseReturnItem,
  ): PurchaseReturnItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      purchaseInvoiceItemId: item.purchaseInvoiceItemId,
      goodsReceiptItemId: item.goodsReceiptItemId,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      taxPercent: Number(item.taxPercent),
      lineSubtotal: Number(item.lineSubtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
    };
  }

  private toResponse(
    purchaseReturn: PurchaseReturn,
  ): PurchaseReturnResponseDto {
    return {
      id: purchaseReturn.id,
      companyId: purchaseReturn.companyId,
      supplierId: purchaseReturn.supplierId,
      warehouseId: purchaseReturn.warehouseId,
      purchaseInvoiceId: purchaseReturn.purchaseInvoiceId,
      goodsReceiptId: purchaseReturn.goodsReceiptId,
      returnNumber: purchaseReturn.returnNumber,
      returnDate: purchaseReturn.returnDate,
      status: purchaseReturn.status,
      currency: purchaseReturn.currency,
      subtotal: Number(purchaseReturn.subtotal),
      discountTotal: Number(purchaseReturn.discountTotal),
      taxTotal: Number(purchaseReturn.taxTotal),
      grandTotal: Number(purchaseReturn.grandTotal),
      reason: purchaseReturn.reason,
      notes: purchaseReturn.notes,
      items: (purchaseReturn.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: purchaseReturn.createdBy,
      updatedBy: purchaseReturn.updatedBy,
      createdAt: purchaseReturn.createdAt,
      updatedAt: purchaseReturn.updatedAt,
      deletedAt: purchaseReturn.deletedAt,
    };
  }
}
