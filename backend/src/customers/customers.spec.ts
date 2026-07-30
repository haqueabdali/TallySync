import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CustomersService } from './customers.service';
import { CustomerEntity } from './entities/customer.entity';

const COMPANY_ID = '0b978620-5af6-4eb2-9f49-e9180fdb6042';
const CUSTOMER_ID = 'f7460869-e54e-435f-bfce-5f949f2609ab';

const customer = {
  id: CUSTOMER_ID,
  companyId: COMPANY_ID,
  name: 'ABC Trading SRL',
  email: 'accounts@abc.it',
  phone: '+39 035 1234567',
  address: 'Bergamo, Italy',
  tallyLedgerName: 'ABC Trading SRL',
  creditLimit: 5000,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deletedAt: null,
  salesOrders: [],
} as CustomerEntity;

function createQueryBuilderMock() {
  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    withDeleted: jest.fn(),
    getExists: jest.fn(),
    getOne: jest.fn(),
    getManyAndCount: jest.fn(),
  };

  Object.values(qb).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReturnValue(qb);
    }
  });

  return qb;
}

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: jest.Mocked<Repository<CustomerEntity>>;
  let qb: ReturnType<typeof createQueryBuilderMock>;

  beforeEach(async () => {
    qb = createQueryBuilderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(CustomerEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            softRemove: jest.fn(),
            restore: jest.fn(),
            createQueryBuilder: jest.fn(() => qb),
          },
        },
      ],
    }).compile();

    service = module.get(CustomersService);
    repository = module.get(getRepositoryToken(CustomerEntity));
  });

  afterEach(() => jest.clearAllMocks());

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a normalized customer', async () => {
    qb.getExists.mockResolvedValue(false);
    repository.create.mockReturnValue(customer);
    repository.save.mockResolvedValue(customer);

    const result = await service.create(
      {
        name: '  ABC Trading SRL  ',
        email: ' Accounts@ABC.IT ',
        creditLimit: 5000,
      },
      { actorId: 'user-id', companyId: COMPANY_ID },
    );

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY_ID,
        name: 'ABC Trading SRL',
        email: 'accounts@abc.it',
      }),
    );
    expect(result.id).toBe(CUSTOMER_ID);
  });

  it('rejects a duplicate email', async () => {
    qb.getExists.mockResolvedValue(true);

    await expect(
      service.create(
        { name: 'ABC', email: 'accounts@abc.it' },
        { actorId: 'user-id', companyId: COMPANY_ID },
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('lists paginated customers', async () => {
    qb.getManyAndCount.mockResolvedValue([[customer], 1]);

    const result = await service.findAll(
      { page: 1, limit: 20, sortBy: 'name', sortOrder: 'ASC' },
      { actorId: 'user-id', companyId: COMPANY_ID },
    );

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.totalPages).toBe(1);
  });

  it('returns one customer in the authenticated company', async () => {
    repository.findOne.mockResolvedValue(customer);

    const result = await service.findOne(CUSTOMER_ID, {
      actorId: 'user-id',
      companyId: COMPANY_ID,
    });

    expect(result.id).toBe(CUSTOMER_ID);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: CUSTOMER_ID, companyId: COMPANY_ID },
    });
  });

  it('throws when the customer does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne(CUSTOMER_ID, {
        actorId: 'user-id',
        companyId: COMPANY_ID,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('soft-deletes a customer', async () => {
    repository.findOne.mockResolvedValue(customer);
    repository.softRemove.mockResolvedValue(customer);

    await service.remove(CUSTOMER_ID, {
      actorId: 'user-id',
      companyId: COMPANY_ID,
    });

    expect(repository.softRemove).toHaveBeenCalledWith(customer);
  });

  it('rejects a request without company context', async () => {
    await expect(
      service.findAll({}, { actorId: 'user-id', companyId: null }),
    ).rejects.toThrow(BadRequestException);
  });
});
