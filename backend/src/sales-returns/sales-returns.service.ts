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

import { CustomerEntity } from '../customers/entities/customer.entity';
import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesInvoiceItemEntity } from '../sales-invoices/entities/sales-invoice-item.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesInvoiceStatus } from '../sales-invoices/enums/sales-invoice-status.enum';
import { WarehouseEntity } from '../warehouses/entities/warehouse.entity';
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { ReverseSalesReturnDto } from './dto/reverse-sales-return.dto';
import { SalesReturnFilterDto } from './dto/sales-return-filter.dto';
import {
  PaginatedSalesReturnsResponseDto,
  SalesReturnItemResponseDto,
  SalesReturnResponseDto,
} from './dto/sales-return-response.dto';
import { UpdateSalesReturnDto } from './dto/update-sales-return.dto';
import { SalesReturnItemEntity } from './entities/sales-return-item.entity';
import { SalesReturnEntity } from './entities/sales-return.entity';
import { SalesReturnStatus } from './enums/sales-return-status.enum';

@Injectable()
export class SalesReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(SalesReturnEntity)
    private readonly salesReturnRepository: Repository<SalesReturnEntity>,

    @InjectRepository(SalesReturnItemEntity)
    private readonly salesReturnItemRepository: Repository<SalesReturnItemEntity>,

    @InjectRepository(SalesInvoiceEntity)
    private readonly salesInvoiceRepository: Repository<SalesInvoiceEntity>,

    @InjectRepository(SalesInvoiceItemEntity)
    private readonly salesInvoiceItemRepository: Repository<SalesInvoiceItemEntity>,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(WarehouseEntity)
    private readonly warehouseRepository: Repository<WarehouseEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreateSalesReturnDto,
    companyId: string,
    userId: string,
  ): Promise<SalesReturnResponseDto> {
    const invoice = await this.getInvoice(
      dto.salesInvoiceId,
      companyId,
    );

    await this.validateHeader(dto, invoice, companyId);
    await this.validateLines(dto, invoice, companyId);

    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(SalesReturnEntity);
      const returnItemRepository =
        manager.getRepository(SalesReturnItemEntity);

      const salesReturn = returnRepository.create({
        companyId,
        customerId: invoice.customerId,
        warehouseId: dto.warehouseId,
        salesInvoiceId: invoice.id,
        returnNumber: await this.generateReturnNumber(
          companyId,
          dto.returnDate,
        ),
        returnDate: dto.returnDate,
        status: SalesReturnStatus.DRAFT,
        currency: invoice.currency,
        subtotal: 0,
        discountTotal: 0,
        taxTotal: 0,
        grandTotal: 0,
        reason: this.optional(dto.reason),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        reversedBy: null,
        reversedAt: null,
        reversalReason: null,
        items: [],
      });

      const savedReturn = await returnRepository.save(salesReturn);

      savedReturn.items = await Promise.all(
        dto.items.map(async (line) => {
          const invoiceItem = invoice.items.find(
            (item) => item.id === line.salesInvoiceItemId,
          );

          if (!invoiceItem) {
            throw new BadRequestException(
              `Sales invoice item ${line.salesInvoiceItemId} is invalid.`,
            );
          }

          const previouslyReturnedQuantity =
            await this.getPreviouslyReturnedQuantity(
              invoiceItem.id,
              companyId,
            );

          const totals = this.calculateLine(
            line.returnQuantity,
            line.unitPrice ?? Number(invoiceItem.unitPrice),
            Number(invoiceItem.discountPercent),
            Number(invoiceItem.taxPercent),
          );

          return returnItemRepository.create({
            salesReturnId: savedReturn.id,
            salesInvoiceItemId: invoiceItem.id,
            itemId: invoiceItem.itemId,
            itemName:
              this.optional(line.itemName) ??
              invoiceItem.itemName ??
              null,
            sku:
              this.optional(line.sku) ??
              invoiceItem.sku ??
              null,
            unit:
              this.optional(line.unit) ??
              invoiceItem.unit ??
              null,
            invoicedQuantity: Number(invoiceItem.quantity),
            previouslyReturnedQuantity,
            returnQuantity: Number(line.returnQuantity),
            unitPrice: Number(
              line.unitPrice ?? invoiceItem.unitPrice,
            ),
            discountPercent: Number(
              invoiceItem.discountPercent,
            ),
            taxPercent: Number(invoiceItem.taxPercent),
            ...totals,
            reason: this.optional(line.reason),
          });
        }),
      );

      savedReturn.items = await returnItemRepository.save(
        savedReturn.items,
      );

      this.calculateReturnTotals(savedReturn);

      return this.toResponse(
        await returnRepository.save(savedReturn),
      );
    });
  }

  async findAll(
    filter: SalesReturnFilterDto,
    companyId: string,
  ): Promise<PaginatedSalesReturnsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.salesReturnRepository
      .createQueryBuilder('salesReturn')
      .leftJoinAndSelect('salesReturn.items', 'items')
      .where('salesReturn.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('salesReturn.return_number ILIKE :search', {
            search,
          })
            .orWhere('salesReturn.reason ILIKE :search', {
              search,
            })
            .orWhere('salesReturn.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere(
        'salesReturn.customer_id = :customerId',
        { customerId: filter.customerId },
      );
    }

    if (filter.warehouseId) {
      query.andWhere(
        'salesReturn.warehouse_id = :warehouseId',
        { warehouseId: filter.warehouseId },
      );
    }

    if (filter.salesInvoiceId) {
      query.andWhere(
        'salesReturn.sales_invoice_id = :salesInvoiceId',
        { salesInvoiceId: filter.salesInvoiceId },
      );
    }

    if (filter.status) {
      query.andWhere('salesReturn.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere(
        'salesReturn.return_date >= :dateFrom',
        { dateFrom: filter.dateFrom },
      );
    }

    if (filter.dateTo) {
      query.andWhere(
        'salesReturn.return_date <= :dateTo',
        { dateTo: filter.dateTo },
      );
    }

    const sortColumns: Record<string, string> = {
      returnNumber: 'salesReturn.return_number',
      returnDate: 'salesReturn.return_date',
      grandTotal: 'salesReturn.grand_total',
      createdAt: 'salesReturn.created_at',
      updatedAt: 'salesReturn.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ??
          'salesReturn.created_at',
        filter.sortOrder,
      )
      .addOrderBy('salesReturn.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [returns, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: returns.map((salesReturn) =>
        this.toResponse(salesReturn),
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
  ): Promise<SalesReturnResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateSalesReturnDto,
    companyId: string,
    userId: string,
  ): Promise<SalesReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(SalesReturnEntity);
      const returnItemRepository =
        manager.getRepository(SalesReturnItemEntity);

      const salesReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!salesReturn) {
        throw new NotFoundException('Sales return not found.');
      }

      this.ensureDraft(salesReturn);

      const invoice = await this.getInvoice(
        dto.salesInvoiceId ?? salesReturn.salesInvoiceId,
        companyId,
      );

      const mergedDto: CreateSalesReturnDto = {
        salesInvoiceId: invoice.id,
        warehouseId:
          dto.warehouseId ?? salesReturn.warehouseId,
        returnDate:
          dto.returnDate ?? salesReturn.returnDate,
        reason:
          dto.reason ?? salesReturn.reason ?? undefined,
        notes:
          dto.notes ?? salesReturn.notes ?? undefined,
        items:
          dto.items ??
          salesReturn.items.map((item) => ({
            salesInvoiceItemId: item.salesInvoiceItemId,
            itemId: item.itemId,
            itemName: item.itemName ?? undefined,
            sku: item.sku ?? undefined,
            unit: item.unit ?? undefined,
            returnQuantity: Number(item.returnQuantity),
            unitPrice: Number(item.unitPrice),
            reason: item.reason ?? undefined,
          })),
      };

      await this.validateHeader(
        mergedDto,
        invoice,
        companyId,
      );
      await this.validateLines(
        mergedDto,
        invoice,
        companyId,
        salesReturn.id,
      );

      if (dto.items) {
        await returnItemRepository.delete({
          salesReturnId: salesReturn.id,
        });

        salesReturn.items = await Promise.all(
          dto.items.map(async (line) => {
            const invoiceItem = invoice.items.find(
              (item) =>
                item.id === line.salesInvoiceItemId,
            );

            if (!invoiceItem) {
              throw new BadRequestException(
                `Sales invoice item ${line.salesInvoiceItemId} is invalid.`,
              );
            }

            const previouslyReturnedQuantity =
              await this.getPreviouslyReturnedQuantity(
                invoiceItem.id,
                companyId,
                salesReturn.id,
              );

            const totals = this.calculateLine(
              line.returnQuantity,
              line.unitPrice ??
                Number(invoiceItem.unitPrice),
              Number(invoiceItem.discountPercent),
              Number(invoiceItem.taxPercent),
            );

            return returnItemRepository.create({
              salesReturnId: salesReturn.id,
              salesInvoiceItemId: invoiceItem.id,
              itemId: invoiceItem.itemId,
              itemName:
                this.optional(line.itemName) ??
                invoiceItem.itemName ??
                null,
              sku:
                this.optional(line.sku) ??
                invoiceItem.sku ??
                null,
              unit:
                this.optional(line.unit) ??
                invoiceItem.unit ??
                null,
              invoicedQuantity: Number(
                invoiceItem.quantity,
              ),
              previouslyReturnedQuantity,
              returnQuantity: Number(
                line.returnQuantity,
              ),
              unitPrice: Number(
                line.unitPrice ??
                  invoiceItem.unitPrice,
              ),
              discountPercent: Number(
                invoiceItem.discountPercent,
              ),
              taxPercent: Number(
                invoiceItem.taxPercent,
              ),
              ...totals,
              reason: this.optional(line.reason),
            });
          }),
        );

        salesReturn.items =
          await returnItemRepository.save(
            salesReturn.items,
          );
      }

      if (dto.salesInvoiceId !== undefined) {
        salesReturn.salesInvoiceId = invoice.id;
        salesReturn.customerId = invoice.customerId;
        salesReturn.currency = invoice.currency;
      }

      if (dto.warehouseId !== undefined) {
        salesReturn.warehouseId = dto.warehouseId;
      }

      if (dto.returnDate !== undefined) {
        salesReturn.returnDate = dto.returnDate;
      }

      if (dto.reason !== undefined) {
        salesReturn.reason = this.optional(dto.reason);
      }

      if (dto.notes !== undefined) {
        salesReturn.notes = this.optional(dto.notes);
      }

      salesReturn.updatedBy = userId;
      this.calculateReturnTotals(salesReturn);

      return this.toResponse(
        await returnRepository.save(salesReturn),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(SalesReturnEntity);
      const invoiceRepository =
        manager.getRepository(SalesInvoiceEntity);
      const itemRepository = manager.getRepository(ItemEntity);
      const customerRepository =
        manager.getRepository(CustomerEntity);

      const salesReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!salesReturn) {
        throw new NotFoundException('Sales return not found.');
      }

      this.ensureDraft(salesReturn);

      const invoice = await invoiceRepository.findOne({
        where: {
          id: salesReturn.salesInvoiceId,
          companyId,
          customerId: salesReturn.customerId,
        },
        relations: { items: true },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      if (
        invoice.status === SalesInvoiceStatus.DRAFT ||
        invoice.status === SalesInvoiceStatus.CANCELLED
      ) {
        throw new ConflictException(
          'Only posted sales invoices can be returned.',
        );
      }

      for (const line of salesReturn.items) {
        const invoiceItem = invoice.items.find(
          (item) => item.id === line.salesInvoiceItemId,
        );

        if (!invoiceItem) {
          throw new NotFoundException(
            `Sales invoice item ${line.salesInvoiceItemId} not found.`,
          );
        }

        const previouslyReturned =
          await this.getPreviouslyReturnedQuantity(
            invoiceItem.id,
            companyId,
            salesReturn.id,
          );

        const remaining =
          Number(invoiceItem.quantity) -
          previouslyReturned;

        if (Number(line.returnQuantity) > remaining) {
          throw new BadRequestException(
            `Return quantity exceeds the remaining returnable quantity for item ${invoiceItem.itemId}.`,
          );
        }

        const item = await itemRepository.findOne({
          where: {
            id: line.itemId,
            companyId,
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Inventory item ${line.itemId} not found.`,
          );
        }

        item.stockQty = this.roundQuantity(
          Number(item.stockQty ?? 0) +
            Number(line.returnQuantity),
        );

        await itemRepository.save(item);
      }

      const returnTotal = this.round(
        Number(salesReturn.grandTotal),
      );

      invoice.grandTotal = this.round(
        Math.max(0, Number(invoice.grandTotal) - returnTotal),
      );

      invoice.balanceDue = this.round(
        Math.max(
          0,
          Number(invoice.balanceDue) - returnTotal,
        ),
      );

      if (Number(invoice.paidAmount) > Number(invoice.grandTotal)) {
        invoice.paidAmount = Number(invoice.grandTotal);
      }

      if (invoice.balanceDue === 0) {
        invoice.status = SalesInvoiceStatus.PAID;
      } else if (Number(invoice.paidAmount) > 0) {
        invoice.status =
          SalesInvoiceStatus.PARTIALLY_PAID;
      } else {
        invoice.status = SalesInvoiceStatus.POSTED;
      }

      await invoiceRepository.save(invoice);

      const customer = await customerRepository.findOne({
        where: {
          id: salesReturn.customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }

      if ('currentBalance' in customer) {
        const currentBalance = Number(
          (
            customer as CustomerEntity & {
              currentBalance?: number | string | null;
            }
          ).currentBalance ?? 0,
        );

        (
          customer as CustomerEntity & {
            currentBalance: number;
          }
        ).currentBalance = this.round(
          Math.max(0, currentBalance - returnTotal),
        );

        await customerRepository.save(customer);
      }

      salesReturn.status = SalesReturnStatus.POSTED;
      salesReturn.postedBy = userId;
      salesReturn.postedAt = new Date();
      salesReturn.updatedBy = userId;

      return this.toResponse(
        await returnRepository.save(salesReturn),
      );
    });
  }

  async reverse(
    id: string,
    dto: ReverseSalesReturnDto,
    companyId: string,
    userId: string,
  ): Promise<SalesReturnResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const returnRepository = manager.getRepository(SalesReturnEntity);
      const invoiceRepository =
        manager.getRepository(SalesInvoiceEntity);
      const itemRepository = manager.getRepository(ItemEntity);
      const customerRepository =
        manager.getRepository(CustomerEntity);

      const salesReturn = await returnRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!salesReturn) {
        throw new NotFoundException('Sales return not found.');
      }

      if (salesReturn.status !== SalesReturnStatus.POSTED) {
        throw new ConflictException(
          'Only posted sales returns can be reversed.',
        );
      }

      const invoice = await invoiceRepository.findOne({
        where: {
          id: salesReturn.salesInvoiceId,
          companyId,
          customerId: salesReturn.customerId,
        },
      });

      if (!invoice) {
        throw new NotFoundException('Sales invoice not found.');
      }

      for (const line of salesReturn.items) {
        const item = await itemRepository.findOne({
          where: {
            id: line.itemId,
            companyId,
          },
        });

        if (!item) {
          throw new NotFoundException(
            `Inventory item ${line.itemId} not found.`,
          );
        }

        const currentStock = Number(item.stockQty ?? 0);
        const reverseQuantity = Number(
          line.returnQuantity,
        );

        if (currentStock < reverseQuantity) {
          throw new ConflictException(
            `Cannot reverse return because stock would become negative for item ${item.name}.`,
          );
        }

        item.stockQty = this.roundQuantity(
          currentStock - reverseQuantity,
        );

        await itemRepository.save(item);
      }

      const returnTotal = this.round(
        Number(salesReturn.grandTotal),
      );

      invoice.grandTotal = this.round(
        Number(invoice.grandTotal) + returnTotal,
      );
      invoice.balanceDue = this.round(
        Number(invoice.balanceDue) + returnTotal,
      );

      invoice.status =
        Number(invoice.paidAmount) === 0
          ? SalesInvoiceStatus.POSTED
          : Number(invoice.paidAmount) >=
              Number(invoice.grandTotal)
            ? SalesInvoiceStatus.PAID
            : SalesInvoiceStatus.PARTIALLY_PAID;

      await invoiceRepository.save(invoice);

      const customer = await customerRepository.findOne({
        where: {
          id: salesReturn.customerId,
          companyId,
        },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found.');
      }

      if ('currentBalance' in customer) {
        const currentBalance = Number(
          (
            customer as CustomerEntity & {
              currentBalance?: number | string | null;
            }
          ).currentBalance ?? 0,
        );

        (
          customer as CustomerEntity & {
            currentBalance: number;
          }
        ).currentBalance = this.round(
          currentBalance + returnTotal,
        );

        await customerRepository.save(customer);
      }

      salesReturn.status = SalesReturnStatus.REVERSED;
      salesReturn.reversedBy = userId;
      salesReturn.reversedAt = new Date();
      salesReturn.reversalReason =
        dto.reversalReason.trim();
      salesReturn.updatedBy = userId;

      return this.toResponse(
        await returnRepository.save(salesReturn),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<SalesReturnResponseDto> {
    const salesReturn = await this.getEntity(id, companyId);

    if (salesReturn.status === SalesReturnStatus.CANCELLED) {
      return this.toResponse(salesReturn);
    }

    this.ensureDraft(salesReturn);

    salesReturn.status = SalesReturnStatus.CANCELLED;
    salesReturn.updatedBy = userId;

    return this.toResponse(
      await this.salesReturnRepository.save(salesReturn),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const salesReturn = await this.getEntity(id, companyId);
    this.ensureDraft(salesReturn);

    await this.salesReturnRepository.softRemove(salesReturn);

    return {
      message: 'Sales return deleted successfully.',
    };
  }

  private async validateHeader(
    dto: CreateSalesReturnDto,
    invoice: SalesInvoiceEntity,
    companyId: string,
  ): Promise<void> {
    const warehouse = await this.warehouseRepository.findOne({
      where: {
        id: dto.warehouseId,
        companyId,
      },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found.');
    }

    if (
      invoice.status === SalesInvoiceStatus.DRAFT ||
      invoice.status === SalesInvoiceStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Only posted sales invoices can be returned.',
      );
    }

    if (
      new Date(dto.returnDate).getTime() <
      new Date(invoice.invoiceDate).getTime()
    ) {
      throw new BadRequestException(
        'Return date cannot be earlier than invoice date.',
      );
    }
  }

  private async validateLines(
    dto: CreateSalesReturnDto,
    invoice: SalesInvoiceEntity,
    companyId: string,
    excludedReturnId?: string,
  ): Promise<void> {
    const invoiceItemIds = dto.items.map(
      (line) => line.salesInvoiceItemId,
    );

    if (
      new Set(invoiceItemIds).size !== invoiceItemIds.length
    ) {
      throw new BadRequestException(
        'Duplicate invoice items are not allowed.',
      );
    }

    for (const line of dto.items) {
      const invoiceItem = invoice.items.find(
        (item) => item.id === line.salesInvoiceItemId,
      );

      if (!invoiceItem) {
        throw new BadRequestException(
          `Sales invoice item ${line.salesInvoiceItemId} does not belong to the selected invoice.`,
        );
      }

      if (invoiceItem.itemId !== line.itemId) {
        throw new BadRequestException(
          `Item ${line.itemId} does not match invoice item ${line.salesInvoiceItemId}.`,
        );
      }

      const previouslyReturned =
        await this.getPreviouslyReturnedQuantity(
          invoiceItem.id,
          companyId,
          excludedReturnId,
        );

      const remaining =
        Number(invoiceItem.quantity) -
        previouslyReturned;

      if (Number(line.returnQuantity) > remaining) {
        throw new BadRequestException(
          `Return quantity exceeds the remaining returnable quantity for item ${line.itemId}.`,
        );
      }

      const item = await this.itemRepository.findOne({
        where: {
          id: line.itemId,
          companyId,
        },
      });

      if (!item) {
        throw new NotFoundException(
          `Inventory item ${line.itemId} not found.`,
        );
      }
    }
  }

  private async getPreviouslyReturnedQuantity(
    salesInvoiceItemId: string,
    companyId: string,
    excludedReturnId?: string,
  ): Promise<number> {
    const query = this.salesReturnItemRepository
      .createQueryBuilder('returnItem')
      .innerJoin(
        SalesReturnEntity,
        'salesReturn',
        'salesReturn.id = returnItem.sales_return_id',
      )
      .select(
        'COALESCE(SUM(returnItem.return_quantity), 0)',
        'quantity',
      )
      .where(
        'returnItem.sales_invoice_item_id = :salesInvoiceItemId',
        { salesInvoiceItemId },
      )
      .andWhere('salesReturn.company_id = :companyId', {
        companyId,
      })
      .andWhere('salesReturn.status = :status', {
        status: SalesReturnStatus.POSTED,
      });

    if (excludedReturnId) {
      query.andWhere('salesReturn.id <> :excludedReturnId', {
        excludedReturnId,
      });
    }

    const result = await query.getRawOne<{
      quantity?: string | number;
    }>();

    return Number(result?.quantity ?? 0);
  }

  private async getInvoice(
    id: string,
    companyId: string,
  ): Promise<SalesInvoiceEntity> {
    const invoice = await this.salesInvoiceRepository.findOne({
      where: {
        id,
        companyId,
      },
      relations: { items: true },
    });

    if (!invoice) {
      throw new NotFoundException('Sales invoice not found.');
    }

    return invoice;
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<SalesReturnEntity> {
    const salesReturn = await this.salesReturnRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!salesReturn) {
      throw new NotFoundException('Sales return not found.');
    }

    return salesReturn;
  }

  private ensureDraft(
    salesReturn: SalesReturnEntity,
  ): void {
    if (salesReturn.status !== SalesReturnStatus.DRAFT) {
      throw new ConflictException(
        'Only draft sales returns can be modified.',
      );
    }
  }

  private calculateLine(
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    taxPercent: number,
  ): Pick<
    SalesReturnItemEntity,
    'lineSubtotal' | 'discountAmount' | 'taxAmount' | 'lineTotal'
  > {
    const lineSubtotal = this.round(
      quantity * unitPrice,
    );
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

  private calculateReturnTotals(
    salesReturn: SalesReturnEntity,
  ): void {
    salesReturn.subtotal = this.round(
      salesReturn.items.reduce(
        (sum, item) =>
          sum + Number(item.lineSubtotal),
        0,
      ),
    );

    salesReturn.discountTotal = this.round(
      salesReturn.items.reduce(
        (sum, item) =>
          sum + Number(item.discountAmount),
        0,
      ),
    );

    salesReturn.taxTotal = this.round(
      salesReturn.items.reduce(
        (sum, item) =>
          sum + Number(item.taxAmount),
        0,
      ),
    );

    salesReturn.grandTotal = this.round(
      salesReturn.subtotal -
        salesReturn.discountTotal +
        salesReturn.taxTotal,
    );
  }

  private async generateReturnNumber(
    companyId: string,
    returnDate: string,
  ): Promise<string> {
    const year = new Date(returnDate).getUTCFullYear();
    const prefix = `SR-${year}-`;

    const latest = await this.salesReturnRepository
      .createQueryBuilder('salesReturn')
      .withDeleted()
      .select(
        'salesReturn.return_number',
        'returnNumber',
      )
      .where('salesReturn.company_id = :companyId', {
        companyId,
      })
      .andWhere(
        'salesReturn.return_number LIKE :prefix',
        { prefix: `${prefix}%` },
      )
      .orderBy(
        'salesReturn.return_number',
        'DESC',
      )
      .getRawOne<{ returnNumber?: string }>();

    const current = latest?.returnNumber
      ? Number(latest.returnNumber.replace(prefix, ''))
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

  private roundQuantity(value: number): number {
    return (
      Math.round((value + Number.EPSILON) * 10000) /
      10000
    );
  }

  private toItemResponse(
    item: SalesReturnItemEntity,
  ): SalesReturnItemResponseDto {
    return {
      id: item.id,
      salesInvoiceItemId: item.salesInvoiceItemId,
      itemId: item.itemId,
      itemName: item.itemName,
      sku: item.sku,
      unit: item.unit,
      invoicedQuantity: Number(item.invoicedQuantity),
      previouslyReturnedQuantity: Number(
        item.previouslyReturnedQuantity,
      ),
      returnQuantity: Number(item.returnQuantity),
      unitPrice: Number(item.unitPrice),
      discountPercent: Number(item.discountPercent),
      taxPercent: Number(item.taxPercent),
      lineSubtotal: Number(item.lineSubtotal),
      discountAmount: Number(item.discountAmount),
      taxAmount: Number(item.taxAmount),
      lineTotal: Number(item.lineTotal),
      reason: item.reason,
    };
  }

  private toResponse(
    salesReturn: SalesReturnEntity,
  ): SalesReturnResponseDto {
    return {
      id: salesReturn.id,
      companyId: salesReturn.companyId,
      customerId: salesReturn.customerId,
      warehouseId: salesReturn.warehouseId,
      salesInvoiceId: salesReturn.salesInvoiceId,
      returnNumber: salesReturn.returnNumber,
      returnDate: salesReturn.returnDate,
      status: salesReturn.status,
      currency: salesReturn.currency,
      subtotal: Number(salesReturn.subtotal),
      discountTotal: Number(
        salesReturn.discountTotal,
      ),
      taxTotal: Number(salesReturn.taxTotal),
      grandTotal: Number(salesReturn.grandTotal),
      reason: salesReturn.reason,
      notes: salesReturn.notes,
      items: (salesReturn.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: salesReturn.createdBy,
      updatedBy: salesReturn.updatedBy,
      postedBy: salesReturn.postedBy,
      postedAt: salesReturn.postedAt,
      reversedBy: salesReturn.reversedBy,
      reversedAt: salesReturn.reversedAt,
      reversalReason: salesReturn.reversalReason,
      createdAt: salesReturn.createdAt,
      updatedAt: salesReturn.updatedAt,
      deletedAt: salesReturn.deletedAt,
    };
  }
}
