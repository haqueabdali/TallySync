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
  EntityManager,
  Repository,
} from 'typeorm';

import { GoodsReceiptItem } from '../goods-receipts/entities/goods-receipt-item.entity';
import { GoodsReceipt } from '../goods-receipts/entities/goods-receipt.entity';
import { GoodsReceiptStatus } from '../goods-receipts/enums/goods-receipt-status.enum';
import { ItemEntity } from '../inventory/entities/item.entity';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { PurchaseInvoiceStatus } from '../purchase-invoices/enums/purchase-invoice-status.enum';
import { SupplierEntity } from '../suppliers/entities/supplier.entity';
import { CreateLandedCostDto } from './dto/create-landed-cost.dto';
import { LandedCostFilterDto } from './dto/landed-cost-filter.dto';
import {
  LandedCostChargeResponseDto,
  LandedCostItemAllocationResponseDto,
  LandedCostResponseDto,
  PaginatedLandedCostsResponseDto,
} from './dto/landed-cost-response.dto';
import { UpdateLandedCostDto } from './dto/update-landed-cost.dto';
import { LandedCostChargeEntity } from './entities/landed-cost-charge.entity';
import { LandedCostItemAllocationEntity } from './entities/landed-cost-item-allocation.entity';
import { LandedCostEntity } from './entities/landed-cost.entity';
import { LandedCostAllocationMethod } from './enums/landed-cost-allocation-method.enum';
import { LandedCostStatus } from './enums/landed-cost-status.enum';

interface AllocationSource {
  goodsReceiptItemId: string;
  itemId: string;
  quantity: number;
  baseValue: number;
  weightValue: number;
  allocationBasis: number;
}

@Injectable()
export class LandedCostsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(LandedCostEntity)
    private readonly landedCostRepository:
      Repository<LandedCostEntity>,

    @InjectRepository(LandedCostChargeEntity)
    private readonly chargeRepository:
      Repository<LandedCostChargeEntity>,

    @InjectRepository(LandedCostItemAllocationEntity)
    private readonly allocationRepository:
      Repository<LandedCostItemAllocationEntity>,

    @InjectRepository(GoodsReceipt)
    private readonly goodsReceiptRepository:
      Repository<GoodsReceipt>,

    @InjectRepository(GoodsReceiptItem)
    private readonly goodsReceiptItemRepository:
      Repository<GoodsReceiptItem>,

    @InjectRepository(PurchaseInvoiceEntity)
    private readonly purchaseInvoiceRepository:
      Repository<PurchaseInvoiceEntity>,

    @InjectRepository(SupplierEntity)
    private readonly supplierRepository:
      Repository<SupplierEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository:
      Repository<ItemEntity>,
  ) {}

  async create(
    dto: CreateLandedCostDto,
    companyId: string,
    userId: string,
  ): Promise<LandedCostResponseDto> {
    this.ensureSourceDocument(dto.goodsReceiptId);

    const source = await this.validateReferences(
      dto,
      companyId,
    );

    return this.dataSource.transaction(async (manager) => {
      const landedCostRepository =
        manager.getRepository(LandedCostEntity);
      const chargeRepository =
        manager.getRepository(LandedCostChargeEntity);
      const allocationRepository =
        manager.getRepository(
          LandedCostItemAllocationEntity,
        );

      const totalCost = this.round(
        dto.charges.reduce(
          (sum, charge) => sum + Number(charge.amount),
          0,
        ),
      );

      const landedCost = landedCostRepository.create({
        companyId,
        goodsReceiptId: dto.goodsReceiptId ?? null,
        purchaseInvoiceId:
          dto.purchaseInvoiceId ?? null,
        landedCostNumber:
          await this.generateLandedCostNumber(
            companyId,
            dto.costDate,
          ),
        costDate: dto.costDate,
        status: LandedCostStatus.Draft,
        allocationMethod: dto.allocationMethod,
        currency: (
          dto.currency ??
          source.purchaseInvoice?.currency ??
          'EUR'
        ).toUpperCase(),
        totalCost,
        notes: this.optional(dto.notes),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        cancelledBy: null,
        cancelledAt: null,
        charges: [],
        itemAllocations: [],
      });

      const saved = await landedCostRepository.save(
        landedCost,
      );

      saved.charges = await chargeRepository.save(
        dto.charges.map((charge) =>
          chargeRepository.create({
            landedCostId: saved.id,
            costType: charge.costType,
            supplierId: charge.supplierId ?? null,
            referenceNumber: this.optional(
              charge.referenceNumber,
            ),
            amount: this.round(charge.amount),
            description: this.optional(
              charge.description,
            ),
          }),
        ),
      );

      const allocationSources =
        this.buildAllocationSources(
          source.goodsReceipt.items,
          dto.allocationMethod,
        );

      saved.itemAllocations =
        await allocationRepository.save(
          this.allocateCosts(
            allocationRepository,
            saved.id,
            allocationSources,
            totalCost,
          ),
        );

      return this.toResponse(
        await landedCostRepository.save(saved),
      );
    });
  }

  async findAll(
    filter: LandedCostFilterDto,
    companyId: string,
  ): Promise<PaginatedLandedCostsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.landedCostRepository
      .createQueryBuilder('landedCost')
      .leftJoinAndSelect(
        'landedCost.charges',
        'charges',
      )
      .leftJoinAndSelect(
        'landedCost.itemAllocations',
        'itemAllocations',
      )
      .where('landedCost.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where(
            'landedCost.landed_cost_number ILIKE :search',
            { search },
          ).orWhere(
            'landedCost.notes ILIKE :search',
            { search },
          );
        }),
      );
    }

    if (filter.goodsReceiptId) {
      query.andWhere(
        'landedCost.goods_receipt_id = :goodsReceiptId',
        {
          goodsReceiptId: filter.goodsReceiptId,
        },
      );
    }

    if (filter.purchaseInvoiceId) {
      query.andWhere(
        'landedCost.purchase_invoice_id = :purchaseInvoiceId',
        {
          purchaseInvoiceId:
            filter.purchaseInvoiceId,
        },
      );
    }

    if (filter.status) {
      query.andWhere(
        'landedCost.status = :status',
        { status: filter.status },
      );
    }

    if (filter.allocationMethod) {
      query.andWhere(
        'landedCost.allocation_method = :allocationMethod',
        {
          allocationMethod:
            filter.allocationMethod,
        },
      );
    }

    if (filter.dateFrom) {
      query.andWhere(
        'landedCost.cost_date >= :dateFrom',
        { dateFrom: filter.dateFrom },
      );
    }

    if (filter.dateTo) {
      query.andWhere(
        'landedCost.cost_date <= :dateTo',
        { dateTo: filter.dateTo },
      );
    }

    const sortColumns: Record<string, string> = {
      landedCostNumber:
        'landedCost.landed_cost_number',
      costDate: 'landedCost.cost_date',
      totalCost: 'landedCost.total_cost',
      createdAt: 'landedCost.created_at',
      updatedAt: 'landedCost.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ??
          'landedCost.created_at',
        filter.sortOrder ?? 'DESC',
      )
      .addOrderBy('landedCost.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [records, total] =
      await query.getManyAndCount();

    const totalPages =
      total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: records.map((record) =>
        this.toResponse(record),
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
  ): Promise<LandedCostResponseDto> {
    return this.toResponse(
      await this.getEntity(id, companyId),
    );
  }

  async update(
    id: string,
    dto: UpdateLandedCostDto,
    companyId: string,
    userId: string,
  ): Promise<LandedCostResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const landedCostRepository =
        manager.getRepository(LandedCostEntity);
      const chargeRepository =
        manager.getRepository(LandedCostChargeEntity);
      const allocationRepository =
        manager.getRepository(
          LandedCostItemAllocationEntity,
        );

      const landedCost =
        await landedCostRepository.findOne({
          where: { id, companyId },
          relations: {
            charges: true,
            itemAllocations: true,
          },
        });

      if (!landedCost) {
        throw new NotFoundException(
          'Landed cost not found.',
        );
      }

      this.ensureDraft(landedCost);

      const goodsReceiptId =
        dto.goodsReceiptId ??
        landedCost.goodsReceiptId ??
        undefined;

      this.ensureSourceDocument(goodsReceiptId);

      const purchaseInvoiceId =
        dto.purchaseInvoiceId ??
        landedCost.purchaseInvoiceId ??
        undefined;

      const allocationMethod =
        dto.allocationMethod ??
        landedCost.allocationMethod;

      const source = await this.validateReferences(
        {
          goodsReceiptId,
          purchaseInvoiceId,
          costDate:
            dto.costDate ?? landedCost.costDate,
          allocationMethod,
          currency:
            dto.currency ?? landedCost.currency,
          notes:
            dto.notes ??
            landedCost.notes ??
            undefined,
          charges:
            dto.charges ??
            landedCost.charges.map((charge) => ({
              costType: charge.costType,
              supplierId:
                charge.supplierId ?? undefined,
              referenceNumber:
                charge.referenceNumber ?? undefined,
              amount: Number(charge.amount),
              description:
                charge.description ?? undefined,
            })),
        },
        companyId,
      );

      if (dto.charges) {
        await chargeRepository.delete({
          landedCostId: landedCost.id,
        });

        landedCost.charges =
          await chargeRepository.save(
            dto.charges.map((charge) =>
              chargeRepository.create({
                landedCostId: landedCost.id,
                costType: charge.costType,
                supplierId:
                  charge.supplierId ?? null,
                referenceNumber: this.optional(
                  charge.referenceNumber,
                ),
                amount: this.round(
                  charge.amount,
                ),
                description: this.optional(
                  charge.description,
                ),
              }),
            ),
          );
      }

      landedCost.goodsReceiptId =
        goodsReceiptId ?? null;
      landedCost.purchaseInvoiceId =
        purchaseInvoiceId ?? null;
      landedCost.costDate =
        dto.costDate ?? landedCost.costDate;
      landedCost.allocationMethod =
        allocationMethod;
      landedCost.currency = (
        dto.currency ??
        source.purchaseInvoice?.currency ??
        landedCost.currency
      ).toUpperCase();

      if (dto.notes !== undefined) {
        landedCost.notes = this.optional(
          dto.notes,
        );
      }

      landedCost.totalCost = this.round(
        landedCost.charges.reduce(
          (sum, charge) =>
            sum + Number(charge.amount),
          0,
        ),
      );

      await allocationRepository.delete({
        landedCostId: landedCost.id,
      });

      const allocationSources =
        this.buildAllocationSources(
          source.goodsReceipt.items,
          allocationMethod,
        );

      landedCost.itemAllocations =
        await allocationRepository.save(
          this.allocateCosts(
            allocationRepository,
            landedCost.id,
            allocationSources,
            landedCost.totalCost,
          ),
        );

      landedCost.updatedBy = userId;

      return this.toResponse(
        await landedCostRepository.save(
          landedCost,
        ),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<LandedCostResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const landedCostRepository =
        manager.getRepository(LandedCostEntity);

      const landedCost =
        await landedCostRepository.findOne({
          where: { id, companyId },
          relations: {
            charges: true,
            itemAllocations: true,
          },
        });

      if (!landedCost) {
        throw new NotFoundException(
          'Landed cost not found.',
        );
      }

      this.ensureDraft(landedCost);

      if (!landedCost.itemAllocations.length) {
        throw new ConflictException(
          'Landed cost has no item allocations.',
        );
      }

      await this.applyInventoryCost(
        manager,
        landedCost,
        false,
      );

      landedCost.status = LandedCostStatus.Posted;
      landedCost.postedBy = userId;
      landedCost.postedAt = new Date();
      landedCost.updatedBy = userId;

      return this.toResponse(
        await landedCostRepository.save(
          landedCost,
        ),
      );
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<LandedCostResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const landedCostRepository =
        manager.getRepository(LandedCostEntity);

      const landedCost =
        await landedCostRepository.findOne({
          where: { id, companyId },
          relations: {
            charges: true,
            itemAllocations: true,
          },
        });

      if (!landedCost) {
        throw new NotFoundException(
          'Landed cost not found.',
        );
      }

      if (
        landedCost.status ===
        LandedCostStatus.Cancelled
      ) {
        return this.toResponse(landedCost);
      }

      if (
        landedCost.status ===
        LandedCostStatus.Posted
      ) {
        await this.applyInventoryCost(
          manager,
          landedCost,
          true,
        );
      }

      landedCost.status =
        LandedCostStatus.Cancelled;
      landedCost.cancelledBy = userId;
      landedCost.cancelledAt = new Date();
      landedCost.updatedBy = userId;

      return this.toResponse(
        await landedCostRepository.save(
          landedCost,
        ),
      );
    });
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const landedCost =
      await this.getEntity(id, companyId);

    this.ensureDraft(landedCost);

    await this.landedCostRepository.softRemove(
      landedCost,
    );

    return {
      message:
        'Landed cost deleted successfully.',
    };
  }

  private async validateReferences(
    dto: CreateLandedCostDto,
    companyId: string,
  ): Promise<{
    goodsReceipt: GoodsReceipt;
    purchaseInvoice:
      | PurchaseInvoiceEntity
      | null;
  }> {
    if (!dto.goodsReceiptId) {
      throw new BadRequestException(
        'goodsReceiptId is required for landed cost allocation.',
      );
    }

    const goodsReceipt =
      await this.goodsReceiptRepository.findOne({
        where: {
          id: dto.goodsReceiptId,
          companyId,
        },
        relations: {
          items: true,
        },
      });

    if (!goodsReceipt) {
      throw new NotFoundException(
        'Goods receipt not found.',
      );
    }

    if (
      goodsReceipt.status !==
      GoodsReceiptStatus.Posted
    ) {
      throw new ConflictException(
        'Only posted goods receipts can receive landed costs.',
      );
    }

    if (!goodsReceipt.items?.length) {
      throw new ConflictException(
        'Goods receipt has no items.',
      );
    }

    let purchaseInvoice:
      | PurchaseInvoiceEntity
      | null = null;

    if (dto.purchaseInvoiceId) {
      purchaseInvoice =
        await this.purchaseInvoiceRepository.findOne({
          where: {
            id: dto.purchaseInvoiceId,
            companyId,
          },
        });

      if (!purchaseInvoice) {
        throw new NotFoundException(
          'Purchase invoice not found.',
        );
      }

      if (
        purchaseInvoice.status !==
          PurchaseInvoiceStatus.Posted &&
        purchaseInvoice.status !==
          PurchaseInvoiceStatus.PartiallyPaid &&
        purchaseInvoice.status !==
          PurchaseInvoiceStatus.Paid
      ) {
        throw new ConflictException(
          'Only posted purchase invoices can be linked to landed costs.',
        );
      }

      if (
        purchaseInvoice.goodsReceiptId &&
        purchaseInvoice.goodsReceiptId !==
          goodsReceipt.id
      ) {
        throw new BadRequestException(
          'Purchase invoice does not belong to the selected goods receipt.',
        );
      }
    }

    const supplierIds = [
      ...new Set(
        dto.charges
          .map((charge) => charge.supplierId)
          .filter(
            (supplierId): supplierId is string =>
              Boolean(supplierId),
          ),
      ),
    ];

    for (const supplierId of supplierIds) {
      const supplier =
        await this.supplierRepository.findOne({
          where: {
            id: supplierId,
            companyId,
          },
        });

      if (!supplier) {
        throw new NotFoundException(
          `Supplier ${supplierId} not found.`,
        );
      }
    }

    return {
      goodsReceipt,
      purchaseInvoice,
    };
  }

  private buildAllocationSources(
    items: GoodsReceiptItem[],
    method: LandedCostAllocationMethod,
  ): AllocationSource[] {
    const sources = items.map((item) => {
      const quantity = Number(
        item.acceptedQty,
      );
      const baseValue = this.round(
        quantity * Number(item.unitCost),
      );

      let allocationBasis: number;

      switch (method) {
        case LandedCostAllocationMethod.ByQuantity:
          allocationBasis = quantity;
          break;

        case LandedCostAllocationMethod.ByWeight:
          throw new BadRequestException(
            'Weight allocation requires an item weight field, which is not currently available.',
          );

        case LandedCostAllocationMethod.Equal:
          allocationBasis = 1;
          break;

        case LandedCostAllocationMethod.ByValue:
        default:
          allocationBasis = baseValue;
          break;
      }

      return {
        goodsReceiptItemId: item.id,
        itemId: item.itemId,
        quantity,
        baseValue,
        weightValue: 0,
        allocationBasis,
      };
    });

    if (
      sources.some(
        (source) =>
          source.quantity <= 0 ||
          source.allocationBasis < 0,
      )
    ) {
      throw new BadRequestException(
        'Goods receipt contains invalid allocation values.',
      );
    }

    const totalBasis = sources.reduce(
      (sum, source) =>
        sum + source.allocationBasis,
      0,
    );

    if (totalBasis <= 0) {
      throw new BadRequestException(
        'The selected allocation method produced a zero allocation basis.',
      );
    }

    return sources;
  }

  private allocateCosts(
    repository: Repository<LandedCostItemAllocationEntity>,
    landedCostId: string,
    sources: AllocationSource[],
    totalCost: number,
  ): LandedCostItemAllocationEntity[] {
    const totalBasis = sources.reduce(
      (sum, source) =>
        sum + source.allocationBasis,
      0,
    );

    let allocatedSoFar = 0;

    return sources.map((source, index) => {
      const allocatedCost =
        index === sources.length - 1
          ? this.round(
              totalCost - allocatedSoFar,
            )
          : this.round(
              totalCost *
                (source.allocationBasis /
                  totalBasis),
            );

      allocatedSoFar = this.round(
        allocatedSoFar + allocatedCost,
      );

      const landedUnitCost =
        source.quantity > 0
          ? this.roundFour(
              source.baseValue /
                source.quantity +
                allocatedCost /
                  source.quantity,
            )
          : 0;

      return repository.create({
        landedCostId,
        goodsReceiptItemId:
          source.goodsReceiptItemId,
        itemId: source.itemId,
        quantity: source.quantity,
        baseValue: source.baseValue,
        weightValue: source.weightValue,
        allocationBasis:
          source.allocationBasis,
        allocatedCost,
        landedUnitCost,
      });
    });
  }

  private async applyInventoryCost(
  manager: EntityManager,
  landedCost: LandedCostEntity,
  reverse: boolean,
): Promise<void> {
  const itemRepository =
    manager.getRepository(ItemEntity);

  for (const allocation of landedCost.itemAllocations) {
    const item = await itemRepository.findOne({
      where: {
        id: allocation.itemId,
        companyId: landedCost.companyId,
      },
    });

    if (!item) {
      throw new NotFoundException(
        `Item ${allocation.itemId} not found.`,
      );
    }

    /*
     * ItemEntity currently has no currentStock property.
     * Use the Goods Receipt allocation quantity as the
     * valuation quantity for this landed-cost document.
     */
    const valuationQuantity = Number(
      allocation.quantity ?? 0,
    );

    if (valuationQuantity <= 0) {
      throw new ConflictException(
        `Item ${item.name} has an invalid landed-cost quantity.`,
      );
    }

    const currentUnitCost = Number(
      item.purchasePrice ?? 0,
    );

    const currentValue = this.round(
      currentUnitCost * valuationQuantity,
    );

    const adjustment =
      Number(allocation.allocatedCost) *
      (reverse ? -1 : 1);

    const nextValue = this.round(
      currentValue + adjustment,
    );

    if (nextValue < 0) {
      throw new ConflictException(
        `Reversing landed cost would make the inventory value negative for item ${item.name}.`,
      );
    }

    item.purchasePrice = this.round(
      nextValue / valuationQuantity,
    );

    await itemRepository.save(item);
  }
}

  private ensureSourceDocument(
    goodsReceiptId?: string,
  ): void {
    if (!goodsReceiptId) {
      throw new BadRequestException(
        'A Goods Receipt is required.',
      );
    }
  }

  private ensureDraft(
    landedCost: LandedCostEntity,
  ): void {
    if (
      landedCost.status !==
      LandedCostStatus.Draft
    ) {
      throw new ConflictException(
        'Only draft landed costs can be modified.',
      );
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<LandedCostEntity> {
    const landedCost =
      await this.landedCostRepository.findOne({
        where: { id, companyId },
        relations: {
          charges: true,
          itemAllocations: true,
        },
      });

    if (!landedCost) {
      throw new NotFoundException(
        'Landed cost not found.',
      );
    }

    return landedCost;
  }

  private async generateLandedCostNumber(
    companyId: string,
    costDate: string,
  ): Promise<string> {
    const year = new Date(
      costDate,
    ).getUTCFullYear();

    const prefix = `LC-${year}-`;

    const latest =
      await this.landedCostRepository
        .createQueryBuilder('landedCost')
        .withDeleted()
        .select(
          'landedCost.landed_cost_number',
          'landedCostNumber',
        )
        .where(
          'landedCost.company_id = :companyId',
          { companyId },
        )
        .andWhere(
          'landedCost.landed_cost_number LIKE :prefix',
          { prefix: `${prefix}%` },
        )
        .orderBy(
          'landedCost.landed_cost_number',
          'DESC',
        )
        .getRawOne<{
          landedCostNumber?: string;
        }>();

    const current =
      latest?.landedCostNumber
        ? Number(
            latest.landedCostNumber.replace(
              prefix,
              '',
            ),
          )
        : 0;

    return `${prefix}${String(
      current + 1,
    ).padStart(6, '0')}`;
  }

  private toChargeResponse(
    charge: LandedCostChargeEntity,
  ): LandedCostChargeResponseDto {
    return {
      id: charge.id,
      costType: charge.costType,
      supplierId: charge.supplierId,
      referenceNumber:
        charge.referenceNumber,
      amount: Number(charge.amount),
      description: charge.description,
    };
  }

  private toAllocationResponse(
    allocation:
      LandedCostItemAllocationEntity,
  ): LandedCostItemAllocationResponseDto {
    return {
      id: allocation.id,
      goodsReceiptItemId:
        allocation.goodsReceiptItemId,
      itemId: allocation.itemId,
      quantity: Number(allocation.quantity),
      baseValue: Number(allocation.baseValue),
      weightValue: Number(
        allocation.weightValue,
      ),
      allocationBasis: Number(
        allocation.allocationBasis,
      ),
      allocatedCost: Number(
        allocation.allocatedCost,
      ),
      landedUnitCost: Number(
        allocation.landedUnitCost,
      ),
    };
  }

  private toResponse(
    landedCost: LandedCostEntity,
  ): LandedCostResponseDto {
    return {
      id: landedCost.id,
      companyId: landedCost.companyId,
      goodsReceiptId:
        landedCost.goodsReceiptId,
      purchaseInvoiceId:
        landedCost.purchaseInvoiceId,
      landedCostNumber:
        landedCost.landedCostNumber,
      costDate: landedCost.costDate,
      status: landedCost.status,
      allocationMethod:
        landedCost.allocationMethod,
      currency: landedCost.currency,
      totalCost: Number(
        landedCost.totalCost,
      ),
      notes: landedCost.notes,
      charges: (
        landedCost.charges ?? []
      ).map((charge) =>
        this.toChargeResponse(charge),
      ),
      itemAllocations: (
        landedCost.itemAllocations ?? []
      ).map((allocation) =>
        this.toAllocationResponse(allocation),
      ),
      createdBy: landedCost.createdBy,
      updatedBy: landedCost.updatedBy,
      postedBy: landedCost.postedBy,
      postedAt: landedCost.postedAt,
      cancelledBy:
        landedCost.cancelledBy,
      cancelledAt:
        landedCost.cancelledAt,
      createdAt: landedCost.createdAt,
      updatedAt: landedCost.updatedAt,
      deletedAt: landedCost.deletedAt,
    };
  }

  private optional(
    value?: string | null,
  ): string | null {
    const normalized = value?.trim();
    return normalized || null;
  }

  private round(value: number): number {
    return Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100;
  }

  private roundFour(value: number): number {
    return Math.round(
      (value + Number.EPSILON) * 10000,
    ) / 10000;
  }
}