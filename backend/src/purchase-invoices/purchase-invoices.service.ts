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

import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptStatus } from '../goods-receipts/enums/goods-receipt-status.enum';
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
import { PurchaseInvoiceItem } from './entities/purchase-invoice-item.entity';
import { PurchaseInvoice } from './entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from './enums/purchase-invoice-status.enum';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(PurchaseInvoice)
    private readonly invoiceRepository: Repository<PurchaseInvoice>,

    @InjectRepository(PurchaseInvoiceItem)
    private readonly invoiceItemRepository: Repository<PurchaseInvoiceItem>,

    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,

    @InjectRepository(PurchaseOrderEntity)
    private readonly purchaseOrderRepository: Repository<PurchaseOrderEntity>,

    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository: Repository<GoodsReceipt>,
  ) {}

  async create(
    dto: CreatePurchaseInvoiceDto,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    await this.validateReferences(dto, companyId);
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));

    return this.dataSource.transaction(async (manager) => {
      const invoiceRepository = manager.getRepository(PurchaseInvoice);
      const itemRepository = manager.getRepository(PurchaseInvoiceItem);

      const invoice = invoiceRepository.create({
        companyId,
        supplierId: dto.supplierId,
        purchaseOrderId: dto.purchaseOrderId ?? null,
        goodsReceiptId: dto.goodsReceiptId ?? null,
        invoiceNumber: await this.generateInvoiceNumber(
          companyId,
          dto.invoiceDate,
        ),
        supplierInvoiceNumber: this.optional(dto.supplierInvoiceNumber),
        invoiceDate: dto.invoiceDate,
        dueDate: dto.dueDate ?? null,
        status: PurchaseInvoiceStatus.Draft,
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        paidAmount: 0,
        balanceDue: 0,
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        items: [],
      });

      const savedInvoice = await invoiceRepository.save(invoice);

      savedInvoice.items = dto.items.map((line) => {
        const totals = this.calculateLine(
          line.quantity,
          line.unitPrice,
          line.discountPercent ?? 0,
          line.taxPercent ?? 0,
        );

        return itemRepository.create({
          purchaseInvoiceId: savedInvoice.id,
          itemId: line.itemId,
          purchaseOrderItemId: line.purchaseOrderItemId ?? null,
          goodsReceiptItemId: line.goodsReceiptItemId ?? null,
          description: this.optional(line.description),
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discountPercent: line.discountPercent ?? 0,
          taxPercent: line.taxPercent ?? 0,
          ...totals,
        });
      });

      savedInvoice.items = await itemRepository.save(savedInvoice.items);
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

    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .where('invoice.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('invoice.invoice_number ILIKE :search', { search })
            .orWhere(
              'invoice.supplier_invoice_number ILIKE :search',
              { search },
            )
            .orWhere('invoice.notes ILIKE :search', { search });
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
      data: invoices.map((invoice) => this.toResponse(invoice)),
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
      const invoiceRepository = manager.getRepository(PurchaseInvoice);
      const itemRepository = manager.getRepository(PurchaseInvoiceItem);

      const invoice = await invoiceRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Purchase invoice not found.');
      }

      this.ensureDraft(invoice);

      await this.validateReferences(
        {
          supplierId: dto.supplierId ?? invoice.supplierId,
          purchaseOrderId:
            dto.purchaseOrderId ?? invoice.purchaseOrderId ?? undefined,
          goodsReceiptId:
            dto.goodsReceiptId ?? invoice.goodsReceiptId ?? undefined,
          invoiceDate: dto.invoiceDate ?? invoice.invoiceDate,
          dueDate: dto.dueDate ?? invoice.dueDate ?? undefined,
          currency: dto.currency ?? invoice.currency,
          supplierInvoiceNumber:
            dto.supplierInvoiceNumber ??
            invoice.supplierInvoiceNumber ??
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
              description: item.description ?? undefined,
              quantity: Number(item.quantity),
              unitPrice: Number(item.unitPrice),
              discountPercent: Number(item.discountPercent),
              taxPercent: Number(item.taxPercent),
            })),
        },
        companyId,
      );

      if (dto.items) {
        this.ensureUniqueItems(dto.items.map((item) => item.itemId));

        await itemRepository.delete({
          purchaseInvoiceId: invoice.id,
        });

        invoice.items = dto.items.map((line) => {
          const totals = this.calculateLine(
            line.quantity,
            line.unitPrice,
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
            description: this.optional(line.description),
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            taxPercent: line.taxPercent ?? 0,
            ...totals,
          });
        });

        invoice.items = await itemRepository.save(invoice.items);
      }

      if (dto.supplierId !== undefined) {
        invoice.supplierId = dto.supplierId;
      }

      if (dto.purchaseOrderId !== undefined) {
        invoice.purchaseOrderId = dto.purchaseOrderId ?? null;
      }

      if (dto.goodsReceiptId !== undefined) {
        invoice.goodsReceiptId = dto.goodsReceiptId ?? null;
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
    this.ensureDraft(invoice);

    if (!invoice.items.length) {
      throw new BadRequestException(
        'Purchase invoice must contain at least one item.',
      );
    }

    if (invoice.goodsReceiptId) {
      const goodsReceipt = await this.goodsReceiptRepository.findOne({
        where: {
          id: invoice.goodsReceiptId,
          companyId,
        },
      });

      if (
        !goodsReceipt ||
        goodsReceipt.status !== GoodsReceiptStatus.Posted
      ) {
        throw new ConflictException(
          'The linked Goods Receipt must be posted.',
        );
      }
    }

    invoice.status = PurchaseInvoiceStatus.Posted;
    invoice.balanceDue = Number(invoice.grandTotal);
    invoice.updatedBy = userId;

    return this.toResponse(
      await this.invoiceRepository.save(invoice),
    );
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    const invoice = await this.getEntity(id, companyId);

    if (invoice.status === PurchaseInvoiceStatus.Paid) {
      throw new ConflictException(
        'A paid purchase invoice cannot be cancelled.',
      );
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new ConflictException(
        'An invoice with payments cannot be cancelled.',
      );
    }

    invoice.status = PurchaseInvoiceStatus.Cancelled;
    invoice.updatedBy = userId;

    return this.toResponse(
      await this.invoiceRepository.save(invoice),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const invoice = await this.getEntity(id, companyId);
    this.ensureDraft(invoice);

    await this.invoiceRepository.softRemove(invoice);

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

    if (dto.purchaseOrderId) {
      const purchaseOrder =
        await this.purchaseOrderRepository.findOne({
          where: {
            id: dto.purchaseOrderId,
            companyId,
          },
        });

      if (!purchaseOrder) {
        throw new NotFoundException(
          'Purchase Order not found.',
        );
      }

      if (purchaseOrder.supplierId !== dto.supplierId) {
        throw new BadRequestException(
          'Purchase Order supplier does not match invoice supplier.',
        );
      }
    }

    if (dto.goodsReceiptId) {
      const goodsReceipt =
        await this.goodsReceiptRepository.findOne({
          where: {
            id: dto.goodsReceiptId,
            companyId,
          },
        });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods Receipt not found.',
        );
      }

      if (goodsReceipt.status === GoodsReceiptStatus.Reversed) {
        throw new ConflictException(
          'A reversed Goods Receipt cannot be invoiced.',
        );
      }

      if (
        dto.purchaseOrderId &&
        goodsReceipt.purchaseOrderId !== dto.purchaseOrderId
      ) {
        throw new BadRequestException(
          'Goods Receipt does not belong to the selected Purchase Order.',
        );
      }
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<PurchaseInvoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Purchase invoice not found.');
    }

    return invoice;
  }

  private ensureDraft(invoice: PurchaseInvoice): void {
    if (invoice.status !== PurchaseInvoiceStatus.Draft) {
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
    unitPrice: number,
    discountPercent: number,
    taxPercent: number,
  ): Pick<
    PurchaseInvoiceItem,
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
    invoice: PurchaseInvoice,
  ): void {
    invoice.subtotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.lineSubtotal),
        0,
      ),
    );

    invoice.discountTotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.discountAmount),
        0,
      ),
    );

    invoice.taxTotal = this.round(
      invoice.items.reduce(
        (sum, item) => sum + Number(item.taxAmount),
        0,
      ),
    );

    invoice.grandTotal = this.round(
      invoice.subtotal -
        invoice.discountTotal +
        invoice.taxTotal,
    );

    invoice.balanceDue = this.round(
      invoice.grandTotal - Number(invoice.paidAmount ?? 0),
    );
  }

  private async generateInvoiceNumber(
    companyId: string,
    invoiceDate: string,
  ): Promise<string> {
    const year = new Date(invoiceDate).getUTCFullYear();
    const prefix = `PINV-${year}-`;

    const latest = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .withDeleted()
      .select('invoice.invoice_number', 'invoiceNumber')
      .where('invoice.company_id = :companyId', { companyId })
      .andWhere('invoice.invoice_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('invoice.invoice_number', 'DESC')
      .getRawOne<{ invoiceNumber?: string }>();

    const current = latest?.invoiceNumber
      ? Number(latest.invoiceNumber.replace(prefix, ''))
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

  private toItemResponse(
    item: PurchaseInvoiceItem,
  ): PurchaseInvoiceItemResponseDto {
    return {
      id: item.id,
      itemId: item.itemId,
      purchaseOrderItemId: item.purchaseOrderItemId,
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
    invoice: PurchaseInvoice,
  ): PurchaseInvoiceResponseDto {
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      supplierId: invoice.supplierId,
      purchaseOrderId: invoice.purchaseOrderId,
      goodsReceiptId: invoice.goodsReceiptId,
      invoiceNumber: invoice.invoiceNumber,
      supplierInvoiceNumber: invoice.supplierInvoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      subtotal: Number(invoice.subtotal),
      discountTotal: Number(invoice.discountTotal),
      taxTotal: Number(invoice.taxTotal),
      grandTotal: Number(invoice.grandTotal),
      paidAmount: Number(invoice.paidAmount),
      balanceDue: Number(invoice.balanceDue),
      notes: invoice.notes,
      items: (invoice.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: invoice.createdBy,
      updatedBy: invoice.updatedBy,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      deletedAt: invoice.deletedAt,
    };
  }
}
