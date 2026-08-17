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

import { AccountingEngineService } from '../accounting-engine/accounting-engine.service';
import { AccountingSettingsEntity } from '../accounting-settings/entities/accounting-settings.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceiptStatus } from '../goods-receipts/enums/goods-receipt-status.enum';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseOrderItemEntity } from '../purchase-orders/entities/purchase-order-item.entity';
import { PurchaseOrderEntity } from '../purchase-orders/entities/purchase-order.entity';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { PurchaseInvoiceFilterDto } from './dto/purchase-invoice-filter.dto';
import {
  PaginatedPurchaseInvoicesResponseDto,
  PurchaseInvoiceItemResponseDto,
  PurchaseInvoiceResponseDto,
} from './dto/purchase-invoice-response.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import { PurchaseInvoiceStatus } from './enums/purchase-invoice-status.enum';
import { PurchaseInvoiceItemEntity } from '../purchase-invoices/entities/purchase-invoice-item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';


@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository: Repository<PurchaseInvoiceEntity>,

    @InjectRepository(PurchaseInvoiceItemEntity)
    private readonly purchaseInvoiceItemRepository: Repository<PurchaseInvoiceItemEntity>,

    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,

    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrderRepository: Repository<PurchaseOrderEntity>,

    @InjectRepository(PurchaseOrderItemEntity)
    private readonly purchaseOrderItemRepository: Repository<PurchaseOrderItemEntity>,

    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,

    @InjectRepository(GoodsReceiptItem)
    private readonly goodsReceiptItemRepository: Repository<GoodsReceiptItem>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,

    @InjectRepository(AccountingSettingsEntity)
    private readonly accountingSettingsRepository:
      Repository<AccountingSettingsEntity>,

    private readonly accountingEngineService:
      AccountingEngineService,
  ) {}

  async create(
    dto: CreatePurchaseInvoiceDto,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository =
        manager.getRepository(PurchaseInvoiceEntity);
      const itemRepository =
        manager.getRepository(PurchaseInvoiceItemEntity);

      const invoice = invoiceRepository.create({
        companyId,
        supplierId: dto.supplierId,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        goodsReceiptId: dto.goodsReceiptId ?? null,
        invoiceNumber: await this.generateInvoiceNumber(
          companyId,
          dto.invoiceDate,
        ),
        supplierInvoiceNumber: this.optional(
          dto.supplierInvoiceNumber,
        ),
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate ?? null,
        status: PurchaseInvoiceStatus.DRAFT,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        shippingTotal: this.round(dto.shippingTotal ?? 0),
        grandTotal: 0,
        paidAmount: 0,
        balanceDue: 0,
        billingAddress: this.optional(dto.billingAddress),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        cancelledBy: null,
        cancelledAt: null,
        items: [],
      });

      const savedInvoice = await invoiceRepository.save(invoice);

      savedInvoice.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitCost,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return itemRepository.create({
          purchaseInvoiceId: savedInvoice.id,
          itemId: line.itemId,
          purchaseOrderItemId:
            line.purchaseOrderItemId ?? null,
          goodsReceiptItemId:
            line.goodsReceiptItemId ?? null,
          itemName: this.optional(line.itemName),
          sku: this.optional(line.sku),
          unit: this.optional(line.unit),
          description: this.optional(line.description),
          quantity: line.quantity,
          unitCost: line.unitCost,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedInvoice.items = await itemRepository.save(
        savedInvoice.items,
      );

      this.calculateInvoiceTotals(savedInvoice);

      return this.toResponse(
        await invoiceRepository.save(savedInvoice),
      );
    });
  }

  async findAll(
    filter: PurchaseInvoiceFilterDto,
    companyId: string,
  ): Promise<PaginatedPurchaseInvoicesResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('invoice.invoice_number ILIKE :search', {
            search,
          })
            .orWhere(
              'invoice.supplier_invoice_number ILIKE :search',
              { search },
            )
            .orWhere('invoice.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.supplierId) {
      query.andWhere('invoice.supplier_id = :supplierId', {
        supplierId: filter.supplierId,
      });
    }

    if (filter.purchaseOrderId) {
      query.andWhere(
        'invoice.purchase_order_id = :purchaseOrderId',
        { purchaseOrderId: filter.purchaseOrderId },
      );
    }

    if (filter.goodsReceiptId) {
      query.andWhere(
        'invoice.goods_receipt_id = :goodsReceiptId',
        { goodsReceiptId: filter.goodsReceiptId },
      );
    }

    if (filter.status) {
      query.andWhere('invoice.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('invoice.invoice_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('invoice.invoice_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    if (filter.dueDateFrom) {
      query.andWhere('invoice.due_date >= :dueDateFrom', {
        dueDateFrom: filter.dueDateFrom,
      });
    }

    if (filter.dueDateTo) {
      query.andWhere('invoice.due_date <= :dueDateTo', {
        dueDateTo: filter.dueDateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      invoiceNumber: 'invoice.invoice_number',
      invoiceDate: 'invoice.invoice_date',
      dueDate: 'invoice.due_date',
      grandTotal: 'invoice.grand_total',
      balanceDue: 'invoice.balance_due',
      createdAt: 'invoice.created_at',
      updatedAt: 'invoice.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'invoice.created_at',
        filter.sortOrder,
      )
      .addOrderBy('invoice.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [invoices, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: invoices.map((invoice) =>
        this.toResponse(invoice),
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
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdatePurchaseInvoiceDto,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository =
        manager.getRepository(PurchaseInvoiceEntity);
      const itemRepository =
        manager.getRepository(PurchaseInvoiceItemEntity);

      const invoice = await invoiceRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException(
          'Purchase invoice not found.',
        );
      }

      this.ensureDraft(invoice);

      const mergedDto: CreatePurchaseInvoiceDto = {
        supplierId: dto.supplierId ?? invoice.supplierId,
        purchaseOrderId:
          dto.purchaseOrderId ??
          invoice.purchaseOrderId ??
          undefined,
        goodsReceiptId:
          dto.goodsReceiptId ??
          invoice.goodsReceiptId ??
          undefined,
        supplierInvoiceNumber:
          dto.supplierInvoiceNumber ??
          invoice.supplierInvoiceNumber ??
          undefined,
        invoiceDate: dto.invoiceDate ?? invoice.invoiceDate,
        dueDate: dto.dueDate ?? invoice.dueDate ?? undefined,
        currency: dto.currency ?? invoice.currency,
        shippingTotal:
          dto.shippingTotal ?? Number(invoice.shippingTotal),
        billingAddress:
          dto.billingAddress ??
          invoice.billingAddress ??
          undefined,
        notes: dto.notes ?? invoice.notes ?? undefined,
        items:
          dto.items ??
          invoice.items.map((item) => ({
            itemId: item.itemId,
            purchaseOrderItemId:
              item.purchaseOrderItemId ?? undefined,
            goodsReceiptItemId:
              item.goodsReceiptItemId ?? undefined,
            itemName: item.itemName ?? undefined,
            sku: item.sku ?? undefined,
            unit: item.unit ?? undefined,
            description: item.description ?? undefined,
            quantity: Number(item.quantity),
            unitCost: Number(item.unitCost),
            discountPercent: Number(item.discountPercent),
            taxPercent: Number(item.taxPercent),
          })),
      };

      await this.validateReferences(mergedDto, companyId);

      if (dto.items) {
        this.ensureUniqueItems(
          dto.items.map((item) => item.itemId),
        );

        await itemRepository.delete({
          purchaseInvoiceId: invoice.id,
        });

        invoice.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitCost,
            line.discountPercent ?? 0,
            line.taxPercent ?? 0,
          );

          return itemRepository.create({
            purchaseInvoiceId: invoice.id,
            itemId: line.itemId,
            purchaseOrderItemId:
              line.purchaseOrderItemId ?? null,
            goodsReceiptItemId:
              line.goodsReceiptItemId ?? null,
            itemName: this.optional(line.itemName),
            sku: this.optional(line.sku),
            unit: this.optional(line.unit),
            description: this.optional(line.description),
            quantity: line.quantity,
            unitCost: line.unitCost,
            discountPercent:
              line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        invoice.items = await itemRepository.save(
          invoice.items,
        );
      }

      if (dto.supplierId !== undefined) {
        invoice.supplierId = dto.supplierId;
      }

      if (dto.purchaseOrderId !== undefined) {
        invoice.purchaseOrderId =
          dto.purchaseOrderId ?? null;
      }

      if (dto.goodsReceiptId !== undefined) {
        invoice.goodsReceiptId =
          dto.goodsReceiptId ?? null;
      }

      if (dto.supplierInvoiceNumber !== undefined) {
        invoice.supplierInvoiceNumber = this.optional(
          dto.supplierInvoiceNumber,
        );
      }

      if (dto.invoiceDate !== undefined) {
        invoice.invoiceDate = dto.invoiceDate;
      }

      if (dto.dueDate !== undefined) {
        invoice.dueDate = dto.dueDate ?? null;
      }

      if (dto.currency !== undefined) {
        invoice.currency = dto.currency.toUpperCase();
      }

      if (dto.shippingTotal !== undefined) {
        invoice.shippingTotal = this.round(
          dto.shippingTotal,
        );
      }

      if (dto.billingAddress !== undefined) {
        invoice.billingAddress = this.optional(
          dto.billingAddress,
        );
      }

      if (dto.notes !== undefined) {
        invoice.notes = this.optional(dto.notes);
      }

      invoice.updatedBy = userId;
      this.calculateInvoiceTotals(invoice);

      return this.toResponse(
        await invoiceRepository.save(invoice),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    const invoice = await this.getEntity(id, companyId);

    /*
     * Retry-safe posting:
     * if the business document is already posted/paid, do not apply its
     * balance effects again. Only retry the idempotent accounting journal.
     */
    if (
      invoice.status === PurchaseInvoiceStatus.POSTED ||
      invoice.status === PurchaseInvoiceStatus.PARTIALLY_PAID ||
      invoice.status === PurchaseInvoiceStatus.PAID
    ) {
      await this.autoPostAccountingIfEnabled(
        invoice.id,
        companyId,
        userId,
      );

      return this.toResponse(invoice);
    }

    this.ensureDraft(invoice);

    if (!invoice.items.length) {
      throw new BadRequestException(
        'Purchase invoice must contain at least one item.',
      );
    }

    invoice.balanceDue = this.round(
      Number(invoice.grandTotal) -
        Number(invoice.paidAmount),
    );

    invoice.status =
      invoice.balanceDue === 0
        ? PurchaseInvoiceStatus.PAID
        : invoice.paidAmount > 0
          ? PurchaseInvoiceStatus.PARTIALLY_PAID
          : PurchaseInvoiceStatus.POSTED;

    invoice.postedBy = userId;
    invoice.postedAt = new Date();
    invoice.updatedBy = userId;

    const saved =
      await this.purchaseInvoiceRepository.save(invoice);

    await this.autoPostAccountingIfEnabled(
      saved.id,
      companyId,
      userId,
    );

    return this.toResponse(saved);
  }

  private async autoPostAccountingIfEnabled(
    invoiceId: string,
    companyId: string,
    userId: string,
  ): Promise<void> {
    const settings =
      await this.accountingSettingsRepository.findOne({
        where: { companyId },
      });

    if (
      settings?.autoPostPurchaseInvoices !== false
    ) {
      await this.accountingEngineService.postPurchaseInvoice(
        invoiceId,
        companyId,
        userId,
      );
    }
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    const invoice = await this.getEntity(id, companyId);

    if (invoice.status === PurchaseInvoiceStatus.CANCELLED) {
      return this.toResponse(invoice);
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new ConflictException(
        'A purchase invoice with payments cannot be cancelled.',
      );
    }

    invoice.status = PurchaseInvoiceStatus.CANCELLED;
    invoice.cancelledBy = userId;
    invoice.cancelledAt = new Date();
    invoice.updatedBy = userId;

    return this.toResponse(
      await this.purchaseInvoiceRepository.save(invoice),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const invoice = await this.getEntity(id, companyId);
    this.ensureDraft(invoice);

    await this.purchaseInvoiceRepository.softRemove(invoice);

    return {
      message: 'Purchase invoice deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreatePurchaseInvoiceDto,
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

    if (
      dto.dueDate &&
      new Date(dto.dueDate).getTime() <
        new Date(dto.invoiceDate).getTime()
    ) {
      throw new BadRequestException(
        'Due date cannot be earlier than invoice date.',
      );
    }

    let purchaseOrder: PurchaseOrderEntity | null = null;
    let goodsReceipt: GoodsReceipt | null = null;

    if (dto.purchaseOrderId) {
      purchaseOrder =
        await this.purchaseOrderRepository.findOne({
          where: {
            id: dto.purchaseOrderId,
            companyId,
          },
          relations: ['items'],
        });

      if (!purchaseOrder) {
        throw new NotFoundException(
          'Purchase order not found.',
        );
      }
    }

    if (dto.goodsReceiptId) {
      goodsReceipt =
        await this.goodsReceiptRepository.findOne({
          where: {
            id: dto.goodsReceiptId,
            companyId,
          },
          relations: ['items'],
        });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods receipt not found.',
        );
      }

      if (goodsReceipt.status !== GoodsReceiptStatus.Posted) {
        throw new ConflictException(
          'Only posted goods receipts can be invoiced.',
        );
      }

      if (
        dto.purchaseOrderId &&
        goodsReceipt.purchaseOrderId !== dto.purchaseOrderId
      ) {
        throw new BadRequestException(
          'Goods receipt does not belong to the selected purchase order.',
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

      if (line.purchaseOrderItemId) {
        const orderItem =
          await this.purchaseOrderItemRepository.findOne({
            where: {
              id: line.purchaseOrderItemId,
            },
          });

        if (
          !orderItem ||
          orderItem.itemId !== line.itemId
        ) {
          throw new BadRequestException(
            `Purchase order item ${line.purchaseOrderItemId} is invalid.`,
          );
        }

        if (
          purchaseOrder &&
          orderItem.purchaseOrderId !== purchaseOrder.id
        ) {
          throw new BadRequestException(
            'Purchase order item does not belong to the selected purchase order.',
          );
        }
      }

      if (line.goodsReceiptItemId) {
        const receiptItem =
          await this.goodsReceiptItemRepository.findOne({
            where: {
              id: line.goodsReceiptItemId,
            },
          });

        if (
          !receiptItem ||
          receiptItem.itemId !== line.itemId
        ) {
          throw new BadRequestException(
            `Goods receipt item ${line.goodsReceiptItemId} is invalid.`,
          );
        }

        if (
          goodsReceipt &&
          receiptItem.goodsReceiptId !== goodsReceipt.id
        ) {
          throw new BadRequestException(
            'Goods receipt item does not belong to the selected goods receipt.',
          );
        }

        if (
          Number(line.quantity) >
          Number(receiptItem.acceptedQty)
        ) {
          throw new BadRequestException(
            `Invoice quantity exceeds accepted receipt quantity for item ${line.itemId}.`,
          );
        }
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<PurchaseInvoiceEntity> {
    const invoice =
      await this.purchaseInvoiceRepository.findOne({
        where: {
          id,
          companyId,
        },
        relations: {
          items: true,
        },
      });

    if (!invoice) {
      throw new NotFoundException(
        'Purchase invoice not found.',
      );
    }

    return invoice;
  }

  private ensureDraft(
    invoice: PurchaseInvoiceEntity,
  ): void {
    if (invoice.status !== PurchaseInvoiceStatus.DRAFT) {
      throw new ConflictException(
        'Only draft purchase invoices can be modified.',
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
    unitCost: number,
    discountPercent: number,
    taxPercent: number,
  ): Pick<
    PurchaseInvoiceItemEntity,
    | 'lineSubtotal'
    | 'discountAmount'
    | 'taxAmount'
    | 'lineTotal'
  > {
    const lineSubtotal = this.round(quantity * unitCost);
    const discountAmount = this.round(
      lineSubtotal * (discountPercent / 100),
    );
    const taxableAmount = this.round(
      lineSubtotal - discountAmount,
    );
    const taxAmount = this.round(
      taxableAmount * (taxPercent / 100),
    );
    const lineTotal = this.round(
      taxableAmount + taxAmount,
    );

    return {
      lineSubtotal,
      discountAmount,
      taxAmount,
      lineTotal,
    };
  }

  private calculateInvoiceTotals(
    invoice: PurchaseInvoiceEntity,
  ): void {
    invoice.subtotal = this.round(
      invoice.items.reduce(
        (sum, item) =>
          sum + Number(item.lineSubtotal),
        0,
      ),
    );

    invoice.discountTotal = this.round(
      invoice.items.reduce(
        (sum, item) =>
          sum + Number(item.discountAmount),
        0,
      ),
    );

    invoice.taxTotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    invoice.shippingTotal = this.round(
      Number(invoice.shippingTotal ?? 0),
    );

    invoice.grandTotal = this.round(
      invoice.subtotal -
        invoice.discountTotal +
        invoice.taxTotal +
        invoice.shippingTotal,
    );

    invoice.balanceDue = this.round(
      invoice.grandTotal -
        Number(invoice.paidAmount ?? 0),
    );
  }

  private async generateInvoiceNumber(
    companyId: string,
    invoiceDate: string,
  ): Promise<string> {
    const year = new Date(invoiceDate).getUTCFullYear();
    const prefix = `PI-${year}-`;

    const latest = await this.purchaseInvoiceRepository
      .createQueryBuilder('invoice')
      .withDeleted()
      .select('invoice.invoice_number', 'invoiceNumber')
      .where('invoice.company_id = :companyId', {
        companyId,
      })
      .andWhere('invoice.invoice_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('invoice.invoice_number', 'DESC')
      .getRawOne<{ invoiceNumber?: string }>();

    const current = latest?.invoiceNumber
      ? Number(
          latest.invoiceNumber.replace(prefix, ''),
        )
      : 0;

    return `${prefix}${String(current + 1).padStart(
      6,
      '0',
    )}`;
  }

  private optional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toItemResponse(
    item: PurchaseInvoiceItemEntity,
  ): PurchaseInvoiceItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      goodsReceiptItemId: item.goodsReceiptItemId,
      itemName: item.itemName,
      sku: item.sku,
      unit: item.unit,
      description: item.description,
      quantity: Number(item.quantity),
      unitCost: Number(item.unitCost),
      discountPercent: Number(item.discountPercent),
      taxPercent: Number(item.taxPercent),
      lineSubtotal: Number(item.lineSubtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
    };
  }

  private toResponse(
    invoice: PurchaseInvoiceEntity,
  ): PurchaseInvoiceResponseDto {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      supplierId: invoice.supplierId,
      purchaseOrderId: invoice.purchaseOrderId,
      goodsReceiptId: invoice.goodsReceiptId,
      invoiceNumber: invoice.invoiceNumber,
      supplierInvoiceNumber:
        invoice.supplierInvoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      discountTotal: Number(invoice.discountTotal),
      taxTotal: Number(invoice.taxTotal),
      shippingTotal: Number(invoice.shippingTotal),
      grandTotal: Number(invoice.grandTotal),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
      billingAddress: invoice.billingAddress,
      notes: invoice.notes,
      items: (invoice.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: invoice.createdBy,
      updatedBy: invoice.updatedBy,
      postedBy: invoice.postedBy,
      postedAt: invoice.postedAt,
      cancelledBy: invoice.cancelledBy,
      cancelledAt: invoice.cancelledAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      deletedAt: invoice.deletedAt,
    };
  }
}
