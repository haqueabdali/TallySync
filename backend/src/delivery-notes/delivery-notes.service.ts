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

import { ItemEntity } from '../inventory/entities/item.entity';
import { SalesOrderItemEntity } from '../sales-orders/entities/sales-order-item.entity';
import { SalesOrderEntity } from '../sales-orders/entities/sales-order.entity';
import { SalesOrderStatus } from '../sales-orders/enums/sales-order-status.enum';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { DeliveryNoteFilterDto } from './dto/delivery-note-filter.dto';
import {
  DeliveryNoteItemResponseDto,
  DeliveryNoteResponseDto,
  PaginatedDeliveryNotesResponseDto,
} from './dto/delivery-note-response.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import { DeliveryNoteItemEntity } from './entities/delivery-note-item.entity';
import { DeliveryNoteEntity } from './entities/delivery-note.entity';
import { DeliveryNoteStatus } from './enums/delivery-note-status.enum';

@Injectable()
export class DeliveryNotesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(DeliveryNoteEntity)
    private readonly deliveryNoteRepository: Repository<DeliveryNoteEntity>,

    @InjectRepository(DeliveryNoteItemEntity)
    private readonly deliveryNoteItemRepository: Repository<DeliveryNoteItemEntity>,

    @InjectRepository(SalesOrderEntity)
    private readonly salesOrderRepository: Repository<SalesOrderEntity>,

    @InjectRepository(SalesOrderItemEntity)
    private readonly salesOrderItemRepository: Repository<SalesOrderItemEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreateDeliveryNoteDto,
    companyId: string,
    userId: string,
  ): Promise<DeliveryNoteResponseDto> {
    const salesOrder = await this.getSalesOrder(
      dto.salesOrderId,
      companyId,
    );

    this.ensureOrderDeliverable(salesOrder);
    await this.validateLines(dto, salesOrder, companyId);

    return this.dataSource.transaction(async (manager) => {
      const noteRepository = manager.getRepository(DeliveryNoteEntity);
      const noteItemRepository =
        manager.getRepository(DeliveryNoteItemEntity);

      const note = noteRepository.create({
        companyId,
        customerId: salesOrder.customerId,
        warehouseId: salesOrder.warehouseId,
        salesOrderId: salesOrder.id,
        deliveryNoteNumber: await this.generateDeliveryNoteNumber(
          companyId,
          dto.deliveryDate,
        ),
        deliveryDate: dto.deliveryDate,
        status: DeliveryNoteStatus.DRAFT,
        shippingAddress:
          this.optional(dto.shippingAddress) ??
          salesOrder.shippingAddress ??
          null,
        trackingNumber: this.optional(dto.trackingNumber),
        carrierName: this.optional(dto.carrierName),
        vehicleNumber: this.optional(dto.vehicleNumber),
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        cancelledBy: null,
        cancelledAt: null,
        items: [],
      });

      const savedNote = await noteRepository.save(note);

      savedNote.items = dto.items.map((line) => {
        const orderItem = salesOrder.items.find(
          (item) => item.id === line.salesOrderItemId,
        );

        if (!orderItem) {
          throw new BadRequestException(
            `Sales order item ${line.salesOrderItemId} is invalid.`,
          );
        }

        return noteItemRepository.create({
          deliveryNoteId: savedNote.id,
          salesOrderItemId: orderItem.id,
          itemId: orderItem.itemId,
          itemName:
            this.optional(line.itemName) ??
            orderItem.itemName ??
            null,
          sku: this.optional(line.sku) ?? orderItem.sku ?? null,
          unit: this.optional(line.unit) ?? orderItem.unit ?? null,
          orderedQuantity: Number(orderItem.quantity),
          previouslyDeliveredQuantity: Number(
            orderItem.deliveredQuantity ?? 0,
          ),
          deliveredQuantity: Number(line.deliveredQuantity),
          unitPrice: Number(
            line.unitPrice ?? orderItem.unitPrice ?? 0,
          ),
          notes: this.optional(line.notes),
        });
      });

      savedNote.items = await noteItemRepository.save(
        savedNote.items,
      );

      return this.toResponse(savedNote);
    });
  }

  async findAll(
    filter: DeliveryNoteFilterDto,
    companyId: string,
  ): Promise<PaginatedDeliveryNotesResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.deliveryNoteRepository
      .createQueryBuilder('deliveryNote')
      .leftJoinAndSelect('deliveryNote.items', 'items')
      .where('deliveryNote.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where(
            'deliveryNote.delivery_note_number ILIKE :search',
            { search },
          )
            .orWhere(
              'deliveryNote.tracking_number ILIKE :search',
              { search },
            )
            .orWhere(
              'deliveryNote.carrier_name ILIKE :search',
              { search },
            )
            .orWhere('deliveryNote.notes ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.customerId) {
      query.andWhere(
        'deliveryNote.customer_id = :customerId',
        { customerId: filter.customerId },
      );
    }

    if (filter.warehouseId) {
      query.andWhere(
        'deliveryNote.warehouse_id = :warehouseId',
        { warehouseId: filter.warehouseId },
      );
    }

    if (filter.salesOrderId) {
      query.andWhere(
        'deliveryNote.sales_order_id = :salesOrderId',
        { salesOrderId: filter.salesOrderId },
      );
    }

    if (filter.status) {
      query.andWhere('deliveryNote.status = :status', {
        status: filter.status,
      });
    }

    if (filter.dateFrom) {
      query.andWhere(
        'deliveryNote.delivery_date >= :dateFrom',
        { dateFrom: filter.dateFrom },
      );
    }

    if (filter.dateTo) {
      query.andWhere(
        'deliveryNote.delivery_date <= :dateTo',
        { dateTo: filter.dateTo },
      );
    }

    const sortColumns: Record<string, string> = {
      deliveryNoteNumber:
        'deliveryNote.delivery_note_number',
      deliveryDate: 'deliveryNote.delivery_date',
      createdAt: 'deliveryNote.created_at',
      updatedAt: 'deliveryNote.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ??
          'deliveryNote.created_at',
        filter.sortOrder,
      )
      .addOrderBy('deliveryNote.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [notes, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: notes.map((note) => this.toResponse(note)),
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
  ): Promise<DeliveryNoteResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateDeliveryNoteDto,
    companyId: string,
    userId: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const noteRepository = manager.getRepository(DeliveryNoteEntity);
      const noteItemRepository =
        manager.getRepository(DeliveryNoteItemEntity);

      const note = await noteRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!note) {
        throw new NotFoundException('Delivery note not found.');
      }

      this.ensureDraft(note);

      const salesOrder = await this.getSalesOrder(
        dto.salesOrderId ?? note.salesOrderId,
        companyId,
      );

      const mergedDto: CreateDeliveryNoteDto = {
        salesOrderId: salesOrder.id,
        deliveryDate: dto.deliveryDate ?? note.deliveryDate,
        shippingAddress:
          dto.shippingAddress ??
          note.shippingAddress ??
          undefined,
        trackingNumber:
          dto.trackingNumber ??
          note.trackingNumber ??
          undefined,
        carrierName:
          dto.carrierName ??
          note.carrierName ??
          undefined,
        vehicleNumber:
          dto.vehicleNumber ??
          note.vehicleNumber ??
          undefined,
        notes: dto.notes ?? note.notes ?? undefined,
        items:
          dto.items ??
          note.items.map((item) => ({
            salesOrderItemId: item.salesOrderItemId,
            itemId: item.itemId,
            itemName: item.itemName ?? undefined,
            sku: item.sku ?? undefined,
            unit: item.unit ?? undefined,
            deliveredQuantity: Number(
              item.deliveredQuantity,
            ),
            unitPrice: Number(item.unitPrice),
            notes: item.notes ?? undefined,
          })),
      };

      this.ensureOrderDeliverable(salesOrder);
      await this.validateLines(
        mergedDto,
        salesOrder,
        companyId,
      );

      if (dto.salesOrderId !== undefined) {
        note.salesOrderId = salesOrder.id;
        note.customerId = salesOrder.customerId;
        note.warehouseId = salesOrder.warehouseId;
      }

      if (dto.deliveryDate !== undefined) {
        note.deliveryDate = dto.deliveryDate;
      }

      if (dto.shippingAddress !== undefined) {
        note.shippingAddress = this.optional(
          dto.shippingAddress,
        );
      }

      if (dto.trackingNumber !== undefined) {
        note.trackingNumber = this.optional(
          dto.trackingNumber,
        );
      }

      if (dto.carrierName !== undefined) {
        note.carrierName = this.optional(dto.carrierName);
      }

      if (dto.vehicleNumber !== undefined) {
        note.vehicleNumber = this.optional(
          dto.vehicleNumber,
        );
      }

      if (dto.notes !== undefined) {
        note.notes = this.optional(dto.notes);
      }

      if (dto.items) {
        await noteItemRepository.delete({
          deliveryNoteId: note.id,
        });

        note.items = dto.items.map((line) => {
          const orderItem = salesOrder.items.find(
            (item) => item.id === line.salesOrderItemId,
          );

          if (!orderItem) {
            throw new BadRequestException(
              `Sales order item ${line.salesOrderItemId} is invalid.`,
            );
          }

          return noteItemRepository.create({
            deliveryNoteId: note.id,
            salesOrderItemId: orderItem.id,
            itemId: orderItem.itemId,
            itemName:
              this.optional(line.itemName) ??
              orderItem.itemName ??
              null,
            sku:
              this.optional(line.sku) ??
              orderItem.sku ??
              null,
            unit:
              this.optional(line.unit) ??
              orderItem.unit ??
              null,
            orderedQuantity: Number(orderItem.quantity),
            previouslyDeliveredQuantity: Number(
              orderItem.deliveredQuantity ?? 0,
            ),
            deliveredQuantity: Number(
              line.deliveredQuantity,
            ),
            unitPrice: Number(
              line.unitPrice ?? orderItem.unitPrice ?? 0,
            ),
            notes: this.optional(line.notes),
          });
        });

        note.items = await noteItemRepository.save(note.items);
      }

      note.updatedBy = userId;

      return this.toResponse(
        await noteRepository.save(note),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const noteRepository = manager.getRepository(DeliveryNoteEntity);
      const salesOrderRepository =
        manager.getRepository(SalesOrderEntity);
      const salesOrderItemRepository =
        manager.getRepository(SalesOrderItemEntity);
      const itemRepository = manager.getRepository(ItemEntity);

      const note = await noteRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!note) {
        throw new NotFoundException('Delivery note not found.');
      }

      this.ensureDraft(note);

      const salesOrder = await salesOrderRepository.findOne({
        where: {
          id: note.salesOrderId,
          companyId,
        },
        relations: { items: true },
      });

      if (!salesOrder) {
        throw new NotFoundException('Sales order not found.');
      }

      this.ensureOrderDeliverable(salesOrder);

      for (const line of note.items) {
        const orderItem = salesOrder.items.find(
          (item) => item.id === line.salesOrderItemId,
        );

        if (!orderItem) {
          throw new NotFoundException(
            `Sales order item ${line.salesOrderItemId} not found.`,
          );
        }

        const quantity = Number(line.deliveredQuantity);
        const ordered = Number(orderItem.quantity);
        const alreadyDelivered = Number(
          orderItem.deliveredQuantity ?? 0,
        );
        const remaining = ordered - alreadyDelivered;

        if (quantity > remaining) {
          throw new BadRequestException(
            `Delivered quantity exceeds the remaining quantity for item ${orderItem.itemId}.`,
          );
        }

        const inventoryItem = await itemRepository.findOne({
          where: {
            id: orderItem.itemId,
            companyId,
          },
        });

        if (!inventoryItem) {
          throw new NotFoundException(
            `Inventory item ${orderItem.itemId} not found.`,
          );
        }

        const currentStock = Number(
          inventoryItem.stockQty ?? 0,
        );

        if (currentStock < quantity) {
          throw new ConflictException(
            `Insufficient stock for item ${inventoryItem.name}.`,
          );
        }

        inventoryItem.stockQty =
          this.roundQuantity(currentStock - quantity);

        orderItem.deliveredQuantity =
          this.roundQuantity(
            alreadyDelivered + quantity,
          );

        await itemRepository.save(inventoryItem);
        await salesOrderItemRepository.save(orderItem);
      }

      this.applyOrderDeliveryStatus(salesOrder);
      await salesOrderRepository.save(salesOrder);

      note.status = DeliveryNoteStatus.POSTED;
      note.postedBy = userId;
      note.postedAt = new Date();
      note.updatedBy = userId;

      return this.toResponse(
        await noteRepository.save(note),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const noteRepository = manager.getRepository(DeliveryNoteEntity);
      const salesOrderRepository =
        manager.getRepository(SalesOrderEntity);
      const salesOrderItemRepository =
        manager.getRepository(SalesOrderItemEntity);
      const itemRepository = manager.getRepository(ItemEntity);

      const note = await noteRepository.findOne({
        where: { id, companyId },
        relations: { items: true },
      });

      if (!note) {
        throw new NotFoundException('Delivery note not found.');
      }

      if (note.status === DeliveryNoteStatus.CANCELLED) {
        return this.toResponse(note);
      }

      if (note.status === DeliveryNoteStatus.POSTED) {
        const salesOrder = await salesOrderRepository.findOne({
          where: {
            id: note.salesOrderId,
            companyId,
          },
          relations: { items: true },
        });

        if (!salesOrder) {
          throw new NotFoundException('Sales order not found.');
        }

        for (const line of note.items) {
          const orderItem = salesOrder.items.find(
            (item) => item.id === line.salesOrderItemId,
          );

          if (!orderItem) {
            throw new NotFoundException(
              `Sales order item ${line.salesOrderItemId} not found.`,
            );
          }

          const quantity = Number(line.deliveredQuantity);
          const delivered = Number(
            orderItem.deliveredQuantity ?? 0,
          );

          if (delivered < quantity) {
            throw new ConflictException(
              `Cannot cancel delivery note because delivered quantity is inconsistent for item ${orderItem.itemId}.`,
            );
          }

          const inventoryItem = await itemRepository.findOne({
            where: {
              id: orderItem.itemId,
              companyId,
            },
          });

          if (!inventoryItem) {
            throw new NotFoundException(
              `Inventory item ${orderItem.itemId} not found.`,
            );
          }

          inventoryItem.stockQty =
            this.roundQuantity(
              Number(inventoryItem.stockQty ?? 0) +
                quantity,
            );

          orderItem.deliveredQuantity =
            this.roundQuantity(delivered - quantity);

          await itemRepository.save(inventoryItem);
          await salesOrderItemRepository.save(orderItem);
        }

        this.applyOrderDeliveryStatus(salesOrder);
        await salesOrderRepository.save(salesOrder);
      }

      note.status = DeliveryNoteStatus.CANCELLED;
      note.cancelledBy = userId;
      note.cancelledAt = new Date();
      note.updatedBy = userId;

      return this.toResponse(
        await noteRepository.save(note),
      );
    });
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const note = await this.getEntity(id, companyId);
    this.ensureDraft(note);

    await this.deliveryNoteRepository.softRemove(note);

    return {
      message: 'Delivery note deleted successfully.',
    };
  }

  private async validateLines(
    dto: CreateDeliveryNoteDto,
    salesOrder: SalesOrderEntity,
    companyId: string,
  ): Promise<void> {
    const lineIds = dto.items.map(
      (line) => line.salesOrderItemId,
    );

    if (new Set(lineIds).size !== lineIds.length) {
      throw new BadRequestException(
        'Duplicate sales order items are not allowed.',
      );
    }

    for (const line of dto.items) {
      const orderItem = salesOrder.items.find(
        (item) => item.id === line.salesOrderItemId,
      );

      if (!orderItem) {
        throw new BadRequestException(
          `Sales order item ${line.salesOrderItemId} does not belong to the selected sales order.`,
        );
      }

      if (orderItem.itemId !== line.itemId) {
        throw new BadRequestException(
          `Item ${line.itemId} does not match sales order item ${line.salesOrderItemId}.`,
        );
      }

      const ordered = Number(orderItem.quantity);
      const delivered = Number(
        orderItem.deliveredQuantity ?? 0,
      );
      const remaining = ordered - delivered;
      const requested = Number(line.deliveredQuantity);

      if (requested > remaining) {
        throw new BadRequestException(
          `Delivered quantity exceeds the remaining quantity for item ${line.itemId}.`,
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

  private async getSalesOrder(
    id: string,
    companyId: string,
  ): Promise<SalesOrderEntity> {
    const salesOrder = await this.salesOrderRepository.findOne({
      where: {
        id,
        companyId,
      },
      relations: { items: true },
    });

    if (!salesOrder) {
      throw new NotFoundException('Sales order not found.');
    }

    return salesOrder;
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<DeliveryNoteEntity> {
    const note = await this.deliveryNoteRepository.findOne({
      where: { id, companyId },
      relations: { items: true },
    });

    if (!note) {
      throw new NotFoundException('Delivery note not found.');
    }

    return note;
  }

  private ensureDraft(note: DeliveryNoteEntity): void {
    if (note.status !== DeliveryNoteStatus.DRAFT) {
      throw new ConflictException(
        'Only draft delivery notes can be modified.',
      );
    }
  }

  private ensureOrderDeliverable(
    order: SalesOrderEntity,
  ): void {
    const deliverableStatuses = new Set<string>([
      SalesOrderStatus.CONFIRMED,
      SalesOrderStatus.APPROVED,
      SalesOrderStatus.PARTIALLY_DELIVERED,
      SalesOrderStatus.Confirmed,
      SalesOrderStatus.Approved,
      SalesOrderStatus.PartiallyDelivered,
    ]);

    if (!deliverableStatuses.has(String(order.status))) {
      throw new ConflictException(
        `Sales order status ${String(
          order.status,
        )} does not allow delivery.`,
      );
    }
  }

  private applyOrderDeliveryStatus(
    order: SalesOrderEntity,
  ): void {
    const totalOrdered = order.items.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );

    const totalDelivered = order.items.reduce(
      (sum, item) =>
        sum + Number(item.deliveredQuantity ?? 0),
      0,
    );

    if (totalDelivered <= 0) {
      order.status = SalesOrderStatus.CONFIRMED;
      return;
    }

    if (totalDelivered >= totalOrdered) {
      order.status = SalesOrderStatus.DELIVERED;
      return;
    }

    order.status = SalesOrderStatus.PARTIALLY_DELIVERED;
  }

  private async generateDeliveryNoteNumber(
    companyId: string,
    deliveryDate: string,
  ): Promise<string> {
    const year = new Date(deliveryDate).getUTCFullYear();
    const prefix = `DN-${year}-`;

    const latest = await this.deliveryNoteRepository
      .createQueryBuilder('deliveryNote')
      .withDeleted()
      .select(
        'deliveryNote.delivery_note_number',
        'deliveryNoteNumber',
      )
      .where('deliveryNote.company_id = :companyId', {
        companyId,
      })
      .andWhere(
        'deliveryNote.delivery_note_number LIKE :prefix',
        { prefix: `${prefix}%` },
      )
      .orderBy(
        'deliveryNote.delivery_note_number',
        'DESC',
      )
      .getRawOne<{ deliveryNoteNumber?: string }>();

    const current = latest?.deliveryNoteNumber
      ? Number(
          latest.deliveryNoteNumber.replace(prefix, ''),
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

  private roundQuantity(value: number): number {
    return (
      Math.round((value + Number.EPSILON) * 10000) /
      10000
    );
  }

  private toItemResponse(
    item: DeliveryNoteItemEntity,
  ): DeliveryNoteItemResponseDto {
    return {
      id: item.id,
      salesOrderItemId: item.salesOrderItemId,
      itemId: item.itemId,
      itemName: item.itemName,
      sku: item.sku,
      unit: item.unit,
      orderedQuantity: Number(item.orderedQuantity),
      previouslyDeliveredQuantity: Number(
        item.previouslyDeliveredQuantity,
      ),
      deliveredQuantity: Number(
        item.deliveredQuantity,
      ),
      unitPrice: Number(item.unitPrice),
      notes: item.notes,
    };
  }

  private toResponse(
    note: DeliveryNoteEntity,
  ): DeliveryNoteResponseDto {
    return {
      id: note.id,
      companyId: note.companyId,
      customerId: note.customerId,
      warehouseId: note.warehouseId,
      salesOrderId: note.salesOrderId,
      deliveryNoteNumber: note.deliveryNoteNumber,
      deliveryDate: note.deliveryDate,
      status: note.status,
      shippingAddress: note.shippingAddress,
      trackingNumber: note.trackingNumber,
      carrierName: note.carrierName,
      vehicleNumber: note.vehicleNumber,
      notes: note.notes,
      items: (note.items ?? []).map((item) =>
        this.toItemResponse(item),
      ),
      createdBy: note.createdBy,
      updatedBy: note.updatedBy,
      postedBy: note.postedBy,
      postedAt: note.postedAt,
      cancelledBy: note.cancelledBy,
      cancelledAt: note.cancelledAt,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      deletedAt: note.deletedAt,
    };
  }
}