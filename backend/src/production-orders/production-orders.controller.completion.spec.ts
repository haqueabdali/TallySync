import {
  Test,
  TestingModule,
} from '@nestjs/testing';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard';

import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';

import {
  ProductionOrdersController,
} from './production-orders.controller';

import {
  ProductionOrdersService,
} from './production-orders.service';

describe('ProductionOrdersController.complete', () => {
  let controller: ProductionOrdersController;
  let service: { complete: jest.Mock };

  beforeEach(async () => {
    service = { complete: jest.fn() };

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [
          ProductionOrdersController,
        ],
        providers: [
          {
            provide: ProductionOrdersService,
            useValue: service,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: () => true,
        })
        .overrideGuard(LicenseFeatureGuard)
        .useValue({
          canActivate: () => true,
        })
        .compile();

    controller = module.get(
      ProductionOrdersController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it(
    'delegates id, companyId and userId to the service',
    async () => {
      const orderId =
        '33333333-3333-4333-8333-333333333333';

      const request = {
        user: {
          id:
            '22222222-2222-4222-8222-222222222222',
          companyId:
            '11111111-1111-4111-8111-111111111111',
        },
      };

      const response = {
        id: orderId,
      };

      service.complete.mockResolvedValue(response);

      await expect(
        controller.complete(
          orderId,
          request as never,
        ),
      ).resolves.toEqual(response);

      expect(service.complete).toHaveBeenCalledWith(
        orderId,
        request.user.companyId,
        request.user.id,
      );
    },
  );
});
