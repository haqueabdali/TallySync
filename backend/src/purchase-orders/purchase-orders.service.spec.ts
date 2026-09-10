import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService', () => {
  describe('findAll', () => {
    it('returns an empty paginated response when no purchase orders exist', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      const orderRepository = {
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      };

      const service = new PurchaseOrdersService(
        orderRepository as any,
        {} as any,
        {} as any,
      );

      const result = await service.findAll('company-id', {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      });
    });
  });
});
