import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { CreateItemDto } from './dto/create-item.dto';
import {
  ItemFilterDto,
  ItemSortField,
  SortOrder,
} from './dto/item-filter.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemEntity } from './entities/item.entity';
import { ItemSyncStatus } from './enums/item-sync-status.enum';
import { PaginatedResult } from './interfaces/item-search.interface';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(ItemEntity)
    private readonly itemsRepository: Repository<ItemEntity>,
  ) {}

  async create(companyId: string, dto: CreateItemDto): Promise<ItemResponseDto> {
    const sku = this.normalizeSku(dto.sku);
    const barcode = this.normalizeNullable(dto.barcode);

    await this.ensureSkuAvailable(companyId, sku);
    if (barcode) await this.ensureBarcodeAvailable(companyId, barcode);

    const openingStock = dto.openingStock ?? 0;
    const item = this.itemsRepository.create({
      companyId,
      categoryId: dto.categoryId ?? null,
      sku,
      barcode,
      name: dto.name.trim(),
      description: this.normalizeNullable(dto.description),
      unit: dto.unit?.trim().toUpperCase() || 'PCS',
      purchasePrice: dto.purchasePrice ?? 0,
      sellingPrice: dto.sellingPrice ?? 0,
      taxRate: dto.taxRate ?? 0,
      openingStock,
      currentStock: openingStock,
      minimumStock: dto.minimumStock ?? 0,
      trackInventory: dto.trackInventory ?? true,
      hsnCode: this.normalizeNullable(dto.hsnCode),
      isActive: dto.isActive ?? true,
      syncStatus: ItemSyncStatus.PENDING,
      syncError: null,
      lastSyncedAt: null,
      tallyStockItemId: null,
    });

    try {
      return this.toResponse(await this.itemsRepository.save(item));
    } catch (error: unknown) {
      this.handleDatabaseConflict(error);
      throw error;
    }
  }

  async findAll(
    companyId: string,
    filter: ItemFilterDto,
  ): Promise<PaginatedResult<ItemResponseDto>> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const query = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('item.name ILIKE :search', { search })
            .orWhere('item.sku ILIKE :search', { search })
            .orWhere('item.barcode ILIKE :search', { search })
            .orWhere('item.description ILIKE :search', { search });
        }),
      );
    }

    if (filter.categoryId) {
      query.andWhere('item.category_id = :categoryId', {
        categoryId: filter.categoryId,
      });
    }
    if (filter.isActive !== undefined) {
      query.andWhere('item.is_active = :isActive', {
        isActive: filter.isActive,
      });
    }
    if (filter.syncStatus) {
      query.andWhere('item.sync_status = :syncStatus', {
        syncStatus: filter.syncStatus,
      });
    }
    if (filter.lowStock === true) {
      query
        .andWhere('item.track_inventory = true')
        .andWhere('item.current_stock <= item.minimum_stock');
    }
    if (filter.outOfStock === true) {
      query
        .andWhere('item.track_inventory = true')
        .andWhere('item.current_stock <= 0');
    }

    const sortOrder =
      filter.sortOrder === SortOrder.ASC ? SortOrder.ASC : SortOrder.DESC;
    query
      .orderBy(this.resolveSortColumn(filter.sortBy), sortOrder)
      .addOrderBy('item.id', sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: items.map((item) => this.toResponse(item)),
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

  async findOne(companyId: string, id: string): Promise<ItemResponseDto> {
    return this.toResponse(await this.findEntity(companyId, id));
  }

  async findBySku(companyId: string, sku: string): Promise<ItemResponseDto> {
    const normalizedSku = this.normalizeSku(sku);
    const item = await this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId })
      .andWhere('UPPER(item.sku) = :sku', { sku: normalizedSku })
      .getOne();

    if (!item) {
      throw new NotFoundException(`Item with SKU "${normalizedSku}" not found`);
    }
    return this.toResponse(item);
  }

  async findByBarcode(
    companyId: string,
    barcode: string,
  ): Promise<ItemResponseDto> {
    const normalizedBarcode = barcode.trim();
    const item = await this.itemsRepository.findOne({
      where: { companyId, barcode: normalizedBarcode },
    });

    if (!item) {
      throw new NotFoundException(
        `Item with barcode "${normalizedBarcode}" not found`,
      );
    }
    return this.toResponse(item);
  }

  async findLowStock(companyId: string): Promise<ItemResponseDto[]> {
    const items = await this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId })
      .andWhere('item.is_active = true')
      .andWhere('item.track_inventory = true')
      .andWhere('item.current_stock <= item.minimum_stock')
      .orderBy('item.current_stock', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .getMany();
    return items.map((item) => this.toResponse(item));
  }

  async findOutOfStock(companyId: string): Promise<ItemResponseDto[]> {
    const items = await this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId })
      .andWhere('item.is_active = true')
      .andWhere('item.track_inventory = true')
      .andWhere('item.current_stock <= 0')
      .orderBy('item.name', 'ASC')
      .getMany();
    return items.map((item) => this.toResponse(item));
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    const item = await this.findEntity(companyId, id);

    if (dto.sku !== undefined) {
      const sku = this.normalizeSku(dto.sku);
      await this.ensureSkuAvailable(companyId, sku, item.id);
      item.sku = sku;
    }
    if (dto.barcode !== undefined) {
      const barcode = this.normalizeNullable(dto.barcode);
      if (barcode) await this.ensureBarcodeAvailable(companyId, barcode, item.id);
      item.barcode = barcode;
    }
    if (dto.categoryId !== undefined) item.categoryId = dto.categoryId;
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.description !== undefined) {
      item.description = this.normalizeNullable(dto.description);
    }
    if (dto.unit !== undefined) item.unit = dto.unit.trim().toUpperCase();
    if (dto.purchasePrice !== undefined) item.purchasePrice = dto.purchasePrice;
    if (dto.sellingPrice !== undefined) item.sellingPrice = dto.sellingPrice;
    if (dto.taxRate !== undefined) item.taxRate = dto.taxRate;
    if (dto.minimumStock !== undefined) item.minimumStock = dto.minimumStock;
    if (dto.trackInventory !== undefined) {
      item.trackInventory = dto.trackInventory;
    }
    if (dto.hsnCode !== undefined) {
      item.hsnCode = this.normalizeNullable(dto.hsnCode);
    }
    if (dto.isActive !== undefined) item.isActive = dto.isActive;

    if (
      dto.openingStock !== undefined &&
      dto.openingStock !== Number(item.openingStock)
    ) {
      const difference = dto.openingStock - Number(item.openingStock);
      item.openingStock = dto.openingStock;
      item.currentStock = Number(item.currentStock) + difference;
    }

    this.markPendingSync(item);
    try {
      return this.toResponse(await this.itemsRepository.save(item));
    } catch (error: unknown) {
      this.handleDatabaseConflict(error);
      throw error;
    }
  }

  async updateStatus(
    companyId: string,
    id: string,
    isActive: boolean,
  ): Promise<ItemResponseDto> {
    const item = await this.findEntity(companyId, id);
    item.isActive = isActive;
    this.markPendingSync(item);
    return this.toResponse(await this.itemsRepository.save(item));
  }

  async remove(companyId: string, id: string): Promise<{ message: string }> {
    const item = await this.findEntity(companyId, id);
    await this.itemsRepository.softRemove(item);
    return { message: 'Item deleted successfully' };
  }

  async restore(companyId: string, id: string): Promise<ItemResponseDto> {
    const item = await this.itemsRepository.findOne({
      where: { id, companyId },
      withDeleted: true,
    });
    if (!item) throw new NotFoundException('Item not found');
    if (item.deletedAt) {
      await this.itemsRepository.restore(item.id);
      item.deletedAt = null;
      this.markPendingSync(item);
      await this.itemsRepository.save(item);
    }
    return this.toResponse(item);
  }

  async findOneForUpdate(
    manager: EntityManager,
    companyId: string,
    id: string,
  ): Promise<ItemEntity> {
    const item = await manager
      .getRepository(ItemEntity)
      .createQueryBuilder('item')
      .setLock('pessimistic_write')
      .where('item.id = :id', { id })
      .andWhere('item.company_id = :companyId', { companyId })
      .getOne();
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  private async findEntity(companyId: string, id: string): Promise<ItemEntity> {
    const item = await this.itemsRepository.findOne({
      where: { id, companyId },
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  private async ensureSkuAvailable(
    companyId: string,
    sku: string,
    excludedId?: string,
  ): Promise<void> {
    const query = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId })
      .andWhere('UPPER(item.sku) = :sku', { sku });
    if (excludedId) query.andWhere('item.id != :excludedId', { excludedId });
    if (await query.getExists()) {
      throw new ConflictException(`Item SKU "${sku}" already exists`);
    }
  }

  private async ensureBarcodeAvailable(
    companyId: string,
    barcode: string,
    excludedId?: string,
  ): Promise<void> {
    const query = this.itemsRepository
      .createQueryBuilder('item')
      .where('item.company_id = :companyId', { companyId })
      .andWhere('item.barcode = :barcode', { barcode });
    if (excludedId) query.andWhere('item.id != :excludedId', { excludedId });
    if (await query.getExists()) {
      throw new ConflictException(`Item barcode "${barcode}" already exists`);
    }
  }

  private resolveSortColumn(sortBy?: ItemSortField): string {
    const columns: Record<ItemSortField, string> = {
      [ItemSortField.NAME]: 'item.name',
      [ItemSortField.SKU]: 'item.sku',
      [ItemSortField.SELLING_PRICE]: 'item.selling_price',
      [ItemSortField.PURCHASE_PRICE]: 'item.purchase_price',
      [ItemSortField.CURRENT_STOCK]: 'item.current_stock',
      [ItemSortField.CREATED_AT]: 'item.created_at',
      [ItemSortField.UPDATED_AT]: 'item.updated_at',
    };
    return columns[sortBy ?? ItemSortField.CREATED_AT];
  }

  private toResponse(item: ItemEntity): ItemResponseDto {
    return {
      id: item.id,
      companyId: item.companyId,
      categoryId: item.categoryId,
      sku: item.sku,
      barcode: item.barcode,
      name: item.name,
      description: item.description,
      unit: item.unit,
      purchasePrice: Number(item.purchasePrice),
      sellingPrice: Number(item.sellingPrice),
      taxRate: Number(item.taxRate),
      openingStock: Number(item.openingStock),
      currentStock: Number(item.currentStock),
      minimumStock: Number(item.minimumStock),
      trackInventory: item.trackInventory,
      hsnCode: item.hsnCode,
      tallyStockItemId: item.tallyStockItemId,
      syncStatus: item.syncStatus,
      syncError: item.syncError,
      lastSyncedAt: item.lastSyncedAt,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
      isLowStock: item.isLowStock,
      isOutOfStock: item.isOutOfStock,
    };
  }

  private normalizeSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private normalizeNullable(value?: string | null): string | null {
    const normalized = value?.trim();
    return normalized || null;
  }

  private markPendingSync(item: ItemEntity): void {
    item.syncStatus = ItemSyncStatus.PENDING;
    item.syncError = null;
  }

  private handleDatabaseConflict(error: unknown): void {
    if (!(error instanceof QueryFailedError)) return;
    const driverError = error.driverError as {
      code?: string;
      constraint?: string;
    };
    if (driverError.code !== '23505') return;
    if (driverError.constraint?.includes('sku')) {
      throw new ConflictException('An item with this SKU already exists');
    }
    if (driverError.constraint?.includes('barcode')) {
      throw new ConflictException('An item with this barcode already exists');
    }
    throw new ConflictException('Duplicate item information');
  }
}
