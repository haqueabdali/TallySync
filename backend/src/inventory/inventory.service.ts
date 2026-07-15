import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  IsNull,
  Repository,
} from 'typeorm';

import { CategoryEntity } from './entities/category.entity';
import {
  InventorySyncStatus,
  ItemEntity,
} from './entities/item.entity';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto';

import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ListItemsQueryDto } from './dto/list-items-query.dto';
import {
  AdjustStockDto,
  StockAdjustmentType,
} from './dto/adjust-stock.dto';

import {
  CategoryResponseDto,
  InventorySummaryResponseDto,
  ItemResponseDto,
  PaginatedCategoriesResponseDto,
  PaginatedItemsResponseDto,
  StockAdjustmentResponseDto,
} from './dto/inventory-response.dto';

/**
 * Context created from the authenticated request.
 *
 * companyId must come from the authenticated JWT rather than
 * from the request body, preventing cross-company access.
 */
export interface InventoryRequestContext {
  actorId: string | null;
  companyId: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,

    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // CATEGORY MANAGEMENT
  // ==========================================================================

  /**
   * Creates an inventory category for the authenticated company.
   */
  async createCategory(
    dto: CreateCategoryDto,
    context: InventoryRequestContext,
  ): Promise<CategoryResponseDto> {
    const companyId = this.requireCompanyId(context);
    const categoryName = this.normalizeRequiredText(
      dto.name,
      'Category name',
    );

    const duplicate = await this.categoryRepository
      .createQueryBuilder('category')
      .withDeleted()
      .where('category.companyId = :companyId', {
        companyId,
      })
      .andWhere(
        'LOWER(category.name) = LOWER(:categoryName)',
        {
          categoryName,
        },
      )
      .andWhere('category.deletedAt IS NULL')
      .getOne();

    if (duplicate) {
      throw new ConflictException(
        'A category with this name already exists',
      );
    }

    const category = this.categoryRepository.create({
      companyId,
      name: categoryName,
      tallyGroup: this.normalizeNullableText(
        dto.tallyGroup,
      ),
    });

    const savedCategory =
      await this.categoryRepository.save(category);

    this.logger.log(
      `Category ${savedCategory.id} created by ${
        context.actorId ?? 'unknown actor'
      }`,
    );

    return this.toCategoryResponse(savedCategory);
  }

  /**
   * Returns paginated categories belonging to the authenticated company.
   */
  async listCategories(
    query: ListCategoriesQueryDto,
    context: InventoryRequestContext,
  ): Promise<PaginatedCategoriesResponseDto> {
    const companyId = this.requireCompanyId(context);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.companyId = :companyId', {
        companyId,
      })
      .andWhere('category.deletedAt IS NULL');

    const search = query.search?.trim();

    if (search) {
      queryBuilder.andWhere(
        new Brackets((builder) => {
          builder
            .where(
              'LOWER(category.name) LIKE LOWER(:search)',
              {
                search: `%${search}%`,
              },
            )
            .orWhere(
              `LOWER(
                COALESCE(category.tallyGroup, '')
              ) LIKE LOWER(:search)`,
              {
                search: `%${search}%`,
              },
            );
        }),
      );
    }

    const allowedSortColumns: Record<string, string> = {
      createdAt: 'category.createdAt',
      updatedAt: 'category.updatedAt',
      name: 'category.name',
      tallyGroup: 'category.tallyGroup',
    };

    const sortColumn =
      allowedSortColumns[query.sortBy ?? 'name'] ??
      'category.name';

    const sortOrder =
      query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const [categories, total] = await queryBuilder
      .orderBy(sortColumn, sortOrder)
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: categories.map((category) =>
        this.toCategoryResponse(category),
      ),
      page,
      limit,
      total,
      totalPages:
        total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  /**
   * Returns one category belonging to the authenticated company.
   */
  async getCategoryById(
    categoryId: string,
    context: InventoryRequestContext,
  ): Promise<CategoryResponseDto> {
    const companyId = this.requireCompanyId(context);

    const category = await this.findCategoryEntity(
      categoryId,
      companyId,
    );

    return this.toCategoryResponse(category);
  }

  /**
   * Updates a category belonging to the authenticated company.
   */
  async updateCategory(
    categoryId: string,
    dto: UpdateCategoryDto,
    context: InventoryRequestContext,
  ): Promise<CategoryResponseDto> {
    const companyId = this.requireCompanyId(context);

    const category = await this.findCategoryEntity(
      categoryId,
      companyId,
    );

    if (dto.name !== undefined) {
      const categoryName = this.normalizeRequiredText(
        dto.name,
        'Category name',
      );

      const duplicate = await this.categoryRepository
        .createQueryBuilder('otherCategory')
        .where(
          'otherCategory.companyId = :companyId',
          {
            companyId,
          },
        )
        .andWhere(
          'LOWER(otherCategory.name) = LOWER(:categoryName)',
          {
            categoryName,
          },
        )
        .andWhere(
          'otherCategory.id != :categoryId',
          {
            categoryId,
          },
        )
        .andWhere(
          'otherCategory.deletedAt IS NULL',
        )
        .getOne();

      if (duplicate) {
        throw new ConflictException(
          'A category with this name already exists',
        );
      }

      category.name = categoryName;
    }

    if (dto.tallyGroup !== undefined) {
      category.tallyGroup =
        this.normalizeNullableText(dto.tallyGroup);
    }

    const savedCategory =
      await this.categoryRepository.save(category);

    this.logger.log(
      `Category ${savedCategory.id} updated by ${
        context.actorId ?? 'unknown actor'
      }`,
    );

    return this.toCategoryResponse(savedCategory);
  }

  /**
   * Soft-deletes a category.
   *
   * A category containing active inventory items cannot be deleted.
   */
  async deleteCategory(
    categoryId: string,
    context: InventoryRequestContext,
  ): Promise<void> {
    const companyId = this.requireCompanyId(context);

    const category = await this.findCategoryEntity(
      categoryId,
      companyId,
    );

    const assignedItemCount =
      await this.itemRepository.count({
        where: {
          companyId,
          categoryId: category.id,
          deletedAt: IsNull(),
        },
      });

    if (assignedItemCount > 0) {
      throw new BadRequestException(
        'Category cannot be deleted while inventory items are assigned to it',
      );
    }

    await this.categoryRepository.softRemove(category);

    this.logger.log(
      `Category ${category.id} deleted by ${
        context.actorId ?? 'unknown actor'
      }`,
    );
  }

  // ==========================================================================
  // ITEM METHODS
  //
  // These methods will be added in Part 2:
  // - createItem
  // - listItems
  // - getItemById
  // - updateItem
  // - deleteItem
  // ==========================================================================

 async createItem(
  dto: CreateItemDto,
  context: InventoryRequestContext,
): Promise<ItemResponseDto> {
  const companyId = this.requireCompanyId(context);

  const itemName = this.normalizeRequiredText(
    dto.name,
    'Item name',
  );

  const normalizedSku =
    this.normalizeNullableText(dto.sku);

  if (normalizedSku) {
    const duplicateSku = await this.itemRepository
      .createQueryBuilder('item')
      .where('item.companyId = :companyId', {
        companyId,
      })
      .andWhere('LOWER(item.sku) = LOWER(:sku)', {
        sku: normalizedSku,
      })
      .andWhere('item.deletedAt IS NULL')
      .getOne();

    if (duplicateSku) {
      throw new ConflictException(
        'An inventory item with this SKU already exists',
      );
    }
  }

  if (dto.categoryId) {
    await this.findCategoryEntity(
      dto.categoryId,
      companyId,
    );
  }

  const salePrice = this.ensureNonNegativeNumber(
    dto.salePrice,
    'Sale price',
  );

  const purchasePrice =
    this.ensureNonNegativeNumber(
      dto.purchasePrice ?? 0,
      'Purchase price',
    );

  const openingStock =
    this.ensureNonNegativeNumber(
      dto.openingStock ?? 0,
      'Opening stock',
    );

  const reorderLevel =
    this.ensureNonNegativeNumber(
      dto.reorderLevel ?? 0,
      'Reorder level',
    );

  const item = this.itemRepository.create({
    companyId,
    categoryId: dto.categoryId ?? null,
    name: itemName,
    sku: normalizedSku,
    unit: this.normalizeRequiredText(
      dto.unit ?? 'Nos',
      'Unit',
    ),
    salePrice,
    purchasePrice,
    stockQty: openingStock,
    reorderLevel,
    tallyItemName: this.normalizeNullableText(
      dto.tallyItemName,
    ),
    syncStatus: InventorySyncStatus.PENDING,
    lastSyncedAt: null,
  });

  const savedItem = await this.itemRepository.save(item);

  const itemWithRelations = await this.findItemEntity(
    savedItem.id,
    companyId,
  );

  this.logger.log(
    `Item ${savedItem.id} created by ${
      context.actorId ?? 'unknown actor'
    }`,
  );

  return this.toItemResponse(itemWithRelations);
}
 async listItems(
  query: ListItemsQueryDto,
  context: InventoryRequestContext,
): Promise<PaginatedItemsResponseDto> {
  const companyId = this.requireCompanyId(context);

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const queryBuilder = this.itemRepository
    .createQueryBuilder('item')
    .leftJoinAndSelect('item.category', 'category')
    .where('item.companyId = :companyId', {
      companyId,
    })
    .andWhere('item.deletedAt IS NULL');

  const search = query.search?.trim();

  if (search) {
    queryBuilder.andWhere(
      new Brackets((builder) => {
        builder
          .where(
            'LOWER(item.name) LIKE LOWER(:search)',
            {
              search: `%${search}%`,
            },
          )
          .orWhere(
            `LOWER(COALESCE(item.sku, ''))
             LIKE LOWER(:search)`,
            {
              search: `%${search}%`,
            },
          )
          .orWhere(
            `LOWER(COALESCE(item.tallyItemName, ''))
             LIKE LOWER(:search)`,
            {
              search: `%${search}%`,
            },
          );
      }),
    );
  }

  if (query.categoryId) {
    queryBuilder.andWhere(
      'item.categoryId = :categoryId',
      {
        categoryId: query.categoryId,
      },
    );
  }

  if (query.syncStatus) {
    queryBuilder.andWhere(
      'item.syncStatus = :syncStatus',
      {
        syncStatus: query.syncStatus,
      },
    );
  }

  const allowedSortColumns: Record<string, string> = {
    createdAt: 'item.createdAt',
    updatedAt: 'item.updatedAt',
    name: 'item.name',
    sku: 'item.sku',
    salePrice: 'item.salePrice',
    purchasePrice: 'item.purchasePrice',
    stockQty: 'item.stockQty',
    reorderLevel: 'item.reorderLevel',
    lastSyncedAt: 'item.lastSyncedAt',
  };

  const sortColumn =
    allowedSortColumns[query.sortBy ?? 'createdAt'] ??
    'item.createdAt';

  const sortOrder =
    query.sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const [items, total] = await queryBuilder
    .orderBy(sortColumn, sortOrder)
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    data: items.map((item) =>
      this.toItemResponse(item),
    ),
    page,
    limit,
    total,
    totalPages:
      total === 0 ? 0 : Math.ceil(total / limit),
  };
}

 async getItemById(
  itemId: string,
  context: InventoryRequestContext,
): Promise<ItemResponseDto> {
  const companyId = this.requireCompanyId(context);

  const item = await this.findItemEntity(
    itemId,
    companyId,
  );

  return this.toItemResponse(item);
}

async updateItem(
  itemId: string,
  dto: UpdateItemDto,
  context: InventoryRequestContext,
): Promise<ItemResponseDto> {
  const companyId = this.requireCompanyId(context);

  const item = await this.findItemEntity(
    itemId,
    companyId,
  );

  if (dto.categoryId !== undefined) {
    if (dto.categoryId === null) {
      item.categoryId = null;
      item.category = null;
    } else {
      const category = await this.findCategoryEntity(
        dto.categoryId,
        companyId,
      );

      item.categoryId = category.id;
      item.category = category;
    }
  }

  if (dto.name !== undefined) {
    item.name = this.normalizeRequiredText(
      dto.name,
      'Item name',
    );
  }

  if (dto.sku !== undefined) {
    const normalizedSku =
      this.normalizeNullableText(dto.sku);

    if (normalizedSku) {
      const duplicateSku = await this.itemRepository
        .createQueryBuilder('otherItem')
        .where(
          'otherItem.companyId = :companyId',
          {
            companyId,
          },
        )
        .andWhere(
          'LOWER(otherItem.sku) = LOWER(:sku)',
          {
            sku: normalizedSku,
          },
        )
        .andWhere(
          'otherItem.id != :itemId',
          {
            itemId,
          },
        )
        .andWhere(
          'otherItem.deletedAt IS NULL',
        )
        .getOne();

      if (duplicateSku) {
        throw new ConflictException(
          'An inventory item with this SKU already exists',
        );
      }
    }

    item.sku = normalizedSku;
  }

  if (dto.unit !== undefined) {
    item.unit = this.normalizeRequiredText(
      dto.unit,
      'Unit',
    );
  }

  if (dto.salePrice !== undefined) {
    item.salePrice =
      this.ensureNonNegativeNumber(
        dto.salePrice,
        'Sale price',
      );
  }

  if (dto.purchasePrice !== undefined) {
    item.purchasePrice =
      this.ensureNonNegativeNumber(
        dto.purchasePrice,
        'Purchase price',
      );
  }

  if (dto.reorderLevel !== undefined) {
    item.reorderLevel =
      this.ensureNonNegativeNumber(
        dto.reorderLevel,
        'Reorder level',
      );
  }

  if (dto.tallyItemName !== undefined) {
    item.tallyItemName =
      this.normalizeNullableText(
        dto.tallyItemName,
      );
  }

  this.markItemPendingSync(item);

  await this.itemRepository.save(item);

  const updatedItem = await this.findItemEntity(
    item.id,
    companyId,
  );

  this.logger.log(
    `Item ${item.id} updated by ${
      context.actorId ?? 'unknown actor'
    }`,
  );

  return this.toItemResponse(updatedItem);
} 
 async deleteItem(
  itemId: string,
  context: InventoryRequestContext,
): Promise<void> {
  const companyId = this.requireCompanyId(context);

  const item = await this.findItemEntity(
    itemId,
    companyId,
  );

  await this.itemRepository.softRemove(item);

  this.logger.log(
    `Item ${item.id} deleted by ${
      context.actorId ?? 'unknown actor'
    }`,
  );
}

 async adjustStock(
  itemId: string,
  dto: AdjustStockDto,
  context: InventoryRequestContext,
): Promise<StockAdjustmentResponseDto> {
  const companyId = this.requireCompanyId(context);

  return this.dataSource.transaction(
    async (entityManager) => {
      const repository =
        entityManager.getRepository(ItemEntity);

      const item = await repository
        .createQueryBuilder('item')
        .setLock('pessimistic_write')
        .leftJoinAndSelect(
          'item.category',
          'category',
        )
        .where('item.id = :itemId', {
          itemId,
        })
        .andWhere(
          'item.companyId = :companyId',
          {
            companyId,
          },
        )
        .andWhere('item.deletedAt IS NULL')
        .getOne();

      if (!item) {
        throw new NotFoundException(
          'Inventory item not found',
        );
      }

      const previousStock = item.stockQty;

      const quantity =
        this.ensureNonNegativeNumber(
          dto.quantity,
          'Adjustment quantity',
        );

      let newStock: number;

      switch (dto.adjustmentType) {
        case StockAdjustmentType.INCREASE:
          if (quantity <= 0) {
            throw new BadRequestException(
              'Increase quantity must be greater than zero',
            );
          }

          newStock = previousStock + quantity;
          break;

        case StockAdjustmentType.DECREASE:
          if (quantity <= 0) {
            throw new BadRequestException(
              'Decrease quantity must be greater than zero',
            );
          }

          newStock = previousStock - quantity;

          if (newStock < 0) {
            throw new BadRequestException(
              `Insufficient stock. Current stock is ${previousStock}`,
            );
          }

          break;

        case StockAdjustmentType.SET:
          newStock = quantity;
          break;

        default:
          throw new BadRequestException(
            'Unsupported stock adjustment type',
          );
      }

      item.stockQty = newStock;

      this.markItemPendingSync(item);

      await repository.save(item);

      this.logger.log(
        `Stock for item ${item.id} adjusted from ${previousStock} to ${newStock} by ${
          context.actorId ?? 'unknown actor'
        }`,
      );

      return {
        itemId: item.id,
        sku: item.sku,
        adjustmentType: dto.adjustmentType,
        previousStock,
        adjustmentQuantity: quantity,
        currentStock: item.stockQty,
        reason: this.normalizeNullableText(
          dto.reason,
        ),
        adjustedAt: new Date(),
      };
    },
  );
}
async getSummary(
  context: InventoryRequestContext,
): Promise<InventorySummaryResponseDto> {
  const companyId = this.requireCompanyId(context);

  const result = await this.itemRepository
    .createQueryBuilder('item')
    .select('COUNT(item.id)', 'totalItems')
    .addSelect(
      'COALESCE(SUM(item.stock_qty), 0)',
      'totalStockQuantity',
    )
    .addSelect(
      `
        COUNT(item.id) FILTER (
          WHERE item.stock_qty <= item.reorder_level
        )
      `,
      'lowStockItems',
    )
    .addSelect(
      `
        COUNT(item.id) FILTER (
          WHERE item.stock_qty = 0
        )
      `,
      'outOfStockItems',
    )
    .addSelect(
      `
        COUNT(item.id) FILTER (
          WHERE item.sync_status = :pendingStatus
        )
      `,
      'pendingSyncItems',
    )
    .addSelect(
      `
        COUNT(item.id) FILTER (
          WHERE item.sync_status = :syncedStatus
        )
      `,
      'syncedItems',
    )
    .addSelect(
      `
        COUNT(item.id) FILTER (
          WHERE item.sync_status = :failedStatus
        )
      `,
      'failedSyncItems',
    )
    .where('item.company_id = :companyId', {
      companyId,
    })
    .andWhere('item.deleted_at IS NULL')
    .setParameters({
      pendingStatus: InventorySyncStatus.PENDING,
      syncedStatus: InventorySyncStatus.SYNCED,
      failedStatus: InventorySyncStatus.FAILED,
    })
    .getRawOne<{
      totalItems: string;
      totalStockQuantity: string;
      lowStockItems: string;
      outOfStockItems: string;
      pendingSyncItems: string;
      syncedItems: string;
      failedSyncItems: string;
    }>();

  const lastSyncedItem = await this.itemRepository
    .createQueryBuilder('item')
    .where('item.company_id = :companyId', {
      companyId,
    })
    .andWhere('item.deleted_at IS NULL')
    .andWhere('item.last_synced_at IS NOT NULL')
    .orderBy('item.last_synced_at', 'DESC')
    .getOne();

  return {
    totalItems: Number(result?.totalItems ?? 0),
    totalStockQuantity: Number(
      result?.totalStockQuantity ?? 0,
    ),
    lowStockItems: Number(
      result?.lowStockItems ?? 0,
    ),
    outOfStockItems: Number(
      result?.outOfStockItems ?? 0,
    ),
    pendingSyncItems: Number(
      result?.pendingSyncItems ?? 0,
    ),
    syncedItems: Number(
      result?.syncedItems ?? 0,
    ),
    failedSyncItems: Number(
      result?.failedSyncItems ?? 0,
    ),
    lastSyncedAt:
      lastSyncedItem?.lastSyncedAt ?? null,
  };
}

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Ensures the request belongs to an assigned company.
   */
  private requireCompanyId(
    context: InventoryRequestContext,
  ): string {
    if (!context.companyId) {
      throw new BadRequestException(
        'The authenticated user is not assigned to a company',
      );
    }

    return context.companyId;
  }

  /**
   * Finds a non-deleted category under one company.
   */
  private async findCategoryEntity(
    categoryId: string,
    companyId: string,
  ): Promise<CategoryEntity> {
    const category =
      await this.categoryRepository.findOne({
        where: {
          id: categoryId,
          companyId,
          deletedAt: IsNull(),
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Inventory category not found',
      );
    }

    return category;
  }

  /**
   * Finds a non-deleted item under one company.
   *
   * Used by later service sections.
   */
  private async findItemEntity(
    itemId: string,
    companyId: string,
  ): Promise<ItemEntity> {
    const item = await this.itemRepository.findOne({
      where: {
        id: itemId,
        companyId,
        deletedAt: IsNull(),
      },
      relations: {
        category: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'Inventory item not found',
      );
    }

    return item;
  }

  /**
   * Maps a CategoryEntity to the external response DTO.
   */
  private toCategoryResponse(
    category: CategoryEntity,
  ): CategoryResponseDto {
    return {
      id: category.id,
      companyId: category.companyId,
      name: category.name,
      tallyGroup: category.tallyGroup,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * Converts an ItemEntity to an API response.
   *
   * Used by later service sections.
   */
  private toItemResponse(
    item: ItemEntity,
  ): ItemResponseDto {
    return {
      id: item.id,
      companyId: item.companyId,
      categoryId: item.categoryId,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      salePrice: item.salePrice,
      purchasePrice: item.purchasePrice,
      stockQty: item.stockQty,
      reorderLevel: item.reorderLevel,
      isLowStock:
        item.stockQty <= item.reorderLevel,
      isOutOfStock: item.stockQty === 0,
      tallyItemName: item.tallyItemName,
      syncStatus: item.syncStatus,
      lastSyncedAt: item.lastSyncedAt,
      category: item.category
        ? {
            id: item.category.id,
            name: item.category.name,
            tallyGroup: item.category.tallyGroup,
          }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Trims required text and rejects an empty value.
   */
  private normalizeRequiredText(
    value: string,
    fieldName: string,
  ): string {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
      throw new BadRequestException(
        `${fieldName} cannot be empty`,
      );
    }

    return normalizedValue;
  }

  /**
   * Converts empty optional strings to null.
   */
  private normalizeNullableText(
    value: string | null | undefined,
  ): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    const normalizedValue = value.trim();

    return normalizedValue.length > 0
      ? normalizedValue
      : null;
  }

  /**
   * Guards against invalid numeric inputs.
   *
   * Used by the item and stock sections.
   */
  private ensureNonNegativeNumber(
    value: number,
    fieldName: string,
  ): number {
    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative number`,
      );
    }

    return value;
  }

  /**
   * Marks an item as requiring Tally synchronization.
   */
  private markItemPendingSync(item: ItemEntity): void {
    item.syncStatus = InventorySyncStatus.PENDING;
    item.lastSyncedAt = null;
  }
}