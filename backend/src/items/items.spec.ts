import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemEntity } from './entities/item.entity';
import { ItemSyncStatus } from './enums/item-sync-status.enum';
import { ItemsService } from './items.service';

type MockRepository = Partial<Record<keyof Repository<ItemEntity>, jest.Mock>>;

const createQueryBuilderMock = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getExists: jest.fn().mockResolvedValue(false),
  getOne: jest.fn(),
  getMany: jest.fn().mockResolvedValue([]),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
});

describe('ItemsService', () => {
  let service: ItemsService;
  let repository: MockRepository;

  const companyId = '64332a5b-a452-45db-a851-8ee462f19c20';
  const itemId = 'f662cd89-cd2e-4a45-b7d0-e2bba54107a0';
  const now = new Date('2026-07-30T08:00:00.000Z');

  const mockItem = Object.assign(new ItemEntity(), {
    id: itemId,
    companyId,
    categoryId: null,
    sku: 'ITEM001',
    barcode: '123456789',
    name: 'Keyboard',
    description: null,
    unit: 'PCS',
    purchasePrice: 10,
    sellingPrice: 15,
    taxRate: 0,
    openingStock: 100,
    currentStock: 100,
    minimumStock: 10,
    trackInventory: true,
    hsnCode: null,
    tallyStockItemId: null,
    syncStatus: ItemSyncStatus.PENDING,
    syncError: null,
    lastSyncedAt: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  });

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
      softRemove: jest.fn(),
      restore: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: getRepositoryToken(ItemEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get(ItemsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return one item', async () => {
    repository.findOne?.mockResolvedValue(mockItem);
    const result = await service.findOne(companyId, itemId);
    expect(result.id).toBe(itemId);
    expect(result.isLowStock).toBe(false);
  });

  it('should throw when an item is not found', async () => {
    repository.findOne?.mockResolvedValue(null);
    await expect(service.findOne(companyId, itemId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create an item', async () => {
    repository.create?.mockReturnValue(mockItem);
    repository.save?.mockResolvedValue(mockItem);

    const result = await service.create(companyId, {
      sku: 'item001',
      name: 'Keyboard',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'ITEM001', companyId }),
    );
    expect(result.name).toBe('Keyboard');
  });

  it('should reject a duplicate SKU', async () => {
    const qb = createQueryBuilderMock();
    qb.getExists.mockResolvedValue(true);
    repository.createQueryBuilder?.mockReturnValue(qb);

    await expect(
      service.create(companyId, { sku: 'ITEM001', name: 'Keyboard' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should soft-delete an item', async () => {
    repository.findOne?.mockResolvedValue(mockItem);
    repository.softRemove?.mockResolvedValue(mockItem);

    await expect(service.remove(companyId, itemId)).resolves.toEqual({
      message: 'Item deleted successfully',
    });
    expect(repository.softRemove).toHaveBeenCalledWith(mockItem);
  });
});
