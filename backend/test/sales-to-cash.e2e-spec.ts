import {
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import {
  Test,
  type TestingModule,
} from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  DataSource,
  Repository,
} from 'typeorm';

import { ensureE2ECommercialLicense } from './helpers/ensure-e2e-commercial-license';

import { AccountEntity } from '../src/accounts/entities/account.entity';
import { AccountNormalBalance } from '../src/accounts/enums/account-normal-balance.enum';
import { AccountStatus } from '../src/accounts/enums/account-status.enum';
import { AccountType } from '../src/accounts/enums/account-type.enum';
import { AccountingSettingsEntity } from '../src/accounting-settings/entities/accounting-settings.entity';
import { CompanyEntity } from '../src/auth/entities/company.entity';
import { RoleEntity } from '../src/auth/entities/role.entity';
import {
  UserEntity,
  UserStatus,
} from '../src/auth/entities/user.entity';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    companyId: string;
    email: string;
    role: string;
  };
}

interface IdResponse {
  id: string;
  [key: string]: unknown;
}

interface SalesOrderResponse extends IdResponse {
  status: string;
  grandTotal: number;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
  }>;
}

interface DeliveryNoteResponse extends IdResponse {
  status: string;
  items: Array<{
    id: string;
    salesOrderItemId: string;
    itemId: string;
    deliveredQuantity: number;
  }>;
}

interface SalesInvoiceResponse extends IdResponse {
  status: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  items: Array<{
    id: string;
    itemId: string;
  }>;
}

interface CustomerPaymentResponse extends IdResponse {
  status: string;
  allocatedAmount: number;
  unallocatedAmount: number;
}

interface ItemResponse extends IdResponse {
  currentStock: number;
}

interface AccountLedgerResponse {
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  lines: Array<{
    sourceType: string;
    sourceId: string | null;
    debit: number;
    credit: number;
  }>;
}

interface AgedReceivablesResponse {
  totals: {
    total: number;
  };
  customers: Array<{
    customerId: string;
    invoices: Array<{
      invoiceId: string;
      outstandingAmount: number;
    }>;
  }>;
}

const configuredDatabaseName =
  process.env.E2E_DATABASE_NAME;

const DATABASE_NAME =
  configuredDatabaseName ??
  'tallysync_e2e_test';

const describeBusinessE2E =
  configuredDatabaseName
    ? describe
    : describe.skip;

function assertSafeTestDatabase(
  databaseName: string,
): void {
  if (
    !/test/i.test(databaseName) ||
    databaseName === 'tallysync_db'
  ) {
    throw new Error(
      `Refusing to run business E2E against unsafe database "${databaseName}". ` +
        'E2E_DATABASE_NAME must contain "test".',
    );
  }
}

function todayIso(): string {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function addDaysIso(
  dateIso: string,
  days: number,
): string {
  const date = new Date(
    `${dateIso}T00:00:00.000Z`,
  );

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

describeBusinessE2E(
  'Sales-to-Cash business flow (e2e)',
  () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;

    let roleRepository: Repository<RoleEntity>;
    let companyRepository: Repository<CompanyEntity>;
    let userRepository: Repository<UserEntity>;
    let accountRepository: Repository<AccountEntity>;
    let settingsRepository: Repository<AccountingSettingsEntity>;

    let token: string;
    let companyId: string;
    let adminUserId: string;

    let accountsReceivableAccountId: string;
    let salesRevenueAccountId: string;
    let cashAccountId: string;

    const password =
      'TallySync-E2E-Password-2026!';

    const runId =
      `${Date.now()}-${Math.floor(
        Math.random() * 100000,
      )}`;

    const api = '/api/v1';

    beforeAll(async () => {
      assertSafeTestDatabase(
        DATABASE_NAME,
      );

      process.env.NODE_ENV =
        'test';

      process.env.DATABASE_NAME =
        DATABASE_NAME;

      process.env.JWT_SECRET =
        process.env.JWT_SECRET ??
        'tallysync-e2e-only-jwt-secret-please-never-use-in-production';

      process.env.BACKGROUND_JOBS_ENABLED =
        'false';

      /*
       * IMPORTANT:
       * Jest/ts-jest is running in CommonJS mode.
       *
       * We intentionally use require() here instead of await import()
       * because Node's VM ESM support is not enabled in the current
       * Jest configuration.
       *
       * require() also preserves the important ordering:
       * environment variables are configured BEFORE DataSource/AppModule
       * are loaded.
       */
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dataSourceModule =
        require(
          '../src/database/data-source',
        ) as {
          default: DataSource;
        };

      const migrationDataSource =
        dataSourceModule.default;

      try {
        if (
          !migrationDataSource.isInitialized
        ) {
          await migrationDataSource.initialize();
        }

        await migrationDataSource.runMigrations();
      } finally {
        if (migrationDataSource.isInitialized) {
          await migrationDataSource.destroy();
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const {
        AppModule,
      } = require(
        '../src/app.module',
      ) as {
        AppModule: new (
          ...args: never[]
        ) => unknown;
      };

      const moduleFixture: TestingModule =
        await Test.createTestingModule({
          imports: [AppModule],
        }).compile();

      app =
        moduleFixture.createNestApplication();

      app.setGlobalPrefix(
        api.slice(1),
      );

      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted:
            true,
          transform: true,
          transformOptions: {
            enableImplicitConversion:
              false,
          },
        }),
      );

      await app.init();

      dataSource =
        app.get(DataSource);

      roleRepository =
        dataSource.getRepository(
          RoleEntity,
        );

      companyRepository =
        dataSource.getRepository(
          CompanyEntity,
        );

      userRepository =
        dataSource.getRepository(
          UserEntity,
        );

      accountRepository =
        dataSource.getRepository(
          AccountEntity,
        );

      settingsRepository =
        dataSource.getRepository(
          AccountingSettingsEntity,
        );

      const role =
        (await roleRepository.findOne({
          where: {
            name: 'admin',
          },
        })) ??
        (await roleRepository.save(
          roleRepository.create({
            name: 'admin',
            description:
              'E2E administrator role',
            isSystem: true,
          }),
        ));

      const company =
        await companyRepository.save(
          companyRepository.create({
            name:
              `E2E Company ${runId}`,
            tallyCompanyName:
              `E2E Company ${runId}`,
            isActive: true,
          }),
        );

      companyId = company.id;

      const user =
        await userRepository.save(
          userRepository.create({
            companyId,
            roleId: role.id,
            fullName:
              'TallySync E2E Administrator',
            email:
              `e2e-${runId}@tallysync.test`,
            passwordHash:
              await bcrypt.hash(
                password,
                12,
              ),
            phone: null,
            status:
              UserStatus.ACTIVE,
            resetTokenHash: null,
            resetTokenExpiresAt:
              null,
            lastLoginAt: null,
          }),
        );

      adminUserId =
        user.id;

      await ensureE2ECommercialLicense(
        dataSource,
        companyId,
        adminUserId,
      );

      const createAccount =
        async (
          code: string,
          name: string,
          type: AccountType,
          normalBalance:
            AccountNormalBalance,
        ): Promise<AccountEntity> =>
          accountRepository.save(
            accountRepository.create({
              companyId,
              code,
              name,
              type,
              normalBalance,
              status:
                AccountStatus.ACTIVE,
              parentId: null,
              isGroup: false,
              isSystemAccount:
                true,
              allowManualEntry:
                true,
              currency: 'EUR',
              description:
                'Sales-to-Cash E2E account',
              createdBy:
                adminUserId,
              updatedBy:
                adminUserId,
            }),
          );

      const ar =
        await createAccount(
          `AR-${runId}`.slice(
            0,
            30,
          ),
          'E2E Accounts Receivable',
          AccountType.ASSET,
          AccountNormalBalance.DEBIT,
        );

      const revenue =
        await createAccount(
          `REV-${runId}`.slice(
            0,
            30,
          ),
          'E2E Sales Revenue',
          AccountType.INCOME,
          AccountNormalBalance.CREDIT,
        );

      const cash =
        await createAccount(
          `CASH-${runId}`.slice(
            0,
            30,
          ),
          'E2E Cash',
          AccountType.ASSET,
          AccountNormalBalance.DEBIT,
        );

      accountsReceivableAccountId =
        ar.id;

      salesRevenueAccountId =
        revenue.id;

      cashAccountId =
        cash.id;

      await settingsRepository.save(
        settingsRepository.create({
          companyId,
          accountsReceivableAccountId:
            ar.id,
          salesRevenueAccountId:
            revenue.id,
          cashAccountId:
            cash.id,

          accountsPayableAccountId:
            null,
          salesReturnsAccountId:
            null,
          outputTaxAccountId:
            null,
          inputTaxAccountId:
            null,
          inventoryAccountId:
            null,
          costOfGoodsSoldAccountId:
            null,
          bankAccountId:
            null,
          cardClearingAccountId:
            null,
          goodsReceivedNotInvoicedAccountId:
            null,
          purchaseExpenseAccountId:
            null,
          roundingDifferenceAccountId:
            null,

          defaultCurrency: 'EUR',
          autoPostSalesInvoices:
            true,
          autoPostCustomerPayments:
            true,
          autoPostSalesReturns:
            true,
          autoPostGoodsReceipts:
            true,
          createdBy:
            adminUserId,
          updatedBy:
            adminUserId,
        }),
      );

      const login =
        await request(
          app.getHttpServer(),
        )
          .post(
            `${api}/auth/login`,
          )
          .send({
            email:
              `e2e-${runId}@tallysync.test`,
            password,
          })
          .expect(200);

      const loginBody =
        login.body as LoginResponse;

      expect(
        loginBody.accessToken,
      ).toEqual(
        expect.any(String),
      );

      expect(
        loginBody.user.companyId,
      ).toBe(companyId);

      token =
        loginBody.accessToken;
    }, 120_000);

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it(
      'runs customer -> order -> delivery -> invoice -> payment -> GL -> AR',
      async () => {
        const date =
          todayIso();

        const dueDate =
          addDaysIso(
            date,
            30,
          );

        const auth = {
          Authorization:
            `Bearer ${token}`,
        };

        const customerResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/customers`,
            )
            .set(auth)
            .send({
              name:
                `E2E Customer ${runId}`,
              email:
                `customer-${runId}@tallysync.test`,
              creditLimit:
                10_000,
            })
            .expect(201);

        const customer =
          customerResponse.body as IdResponse;

        const warehouseResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/warehouses`,
            )
            .set(auth)
            .send({
              name:
                `E2E Warehouse ${runId}`,
              isActive: true,
            })
            .expect(201);

        const warehouse =
          warehouseResponse.body as IdResponse;

        const itemResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/items`,
            )
            .set(auth)
            .send({
              sku:
                `E2E-${runId}`
                  .replace(
                    /[^A-Za-z0-9._/-]/g,
                    '-',
                  )
                  .slice(
                    0,
                    50,
                  ),
              name:
                `E2E Product ${runId}`,
              unit: 'PCS',
              purchasePrice: 60,
              sellingPrice: 100,
              taxRate: 0,
              openingStock: 10,
              minimumStock: 1,
              trackInventory:
                true,
              isActive: true,
            })
            .expect(201);

        const item =
          itemResponse.body as ItemResponse;

        expect(
          Number(
            item.currentStock,
          ),
        ).toBe(10);

        const salesOrderResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/sales-orders`,
            )
            .set(auth)
            .send({
              customerId:
                customer.id,
              warehouseId:
                warehouse.id,
              orderDate: date,
              expectedDeliveryDate:
                date,
              currency: 'EUR',
              shippingTotal: 0,
              items: [
                {
                  itemId:
                    item.id,
                  quantity: 2,
                  unitPrice: 100,
                  discountPercent:
                    0,
                  taxPercent: 0,
                },
              ],
            })
            .expect(201);

        const salesOrder =
          salesOrderResponse.body as SalesOrderResponse;

        expect(
          salesOrder.status,
        ).toBe('draft');

        expect(
          Number(
            salesOrder.grandTotal,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        const confirmedResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/sales-orders/${salesOrder.id}/confirm`,
            )
            .set(auth)
            .expect(201);

        const confirmed =
          confirmedResponse.body as SalesOrderResponse;

        expect(
          confirmed.status,
        ).toBe(
          'confirmed',
        );

        const deliveryResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/delivery-notes`,
            )
            .set(auth)
            .send({
              salesOrderId:
                salesOrder.id,
              deliveryDate:
                date,
              items: [
                {
                  salesOrderItemId:
                    salesOrder.items[0].id,
                  itemId:
                    item.id,
                  deliveredQuantity:
                    2,
                  unitPrice: 100,
                },
              ],
            })
            .expect(201);

        const delivery =
          deliveryResponse.body as DeliveryNoteResponse;

        expect(
          delivery.status,
        ).toBe('draft');

        const postedDeliveryResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/delivery-notes/${delivery.id}/post`,
            )
            .set(auth)
            .expect(201);

        const postedDelivery =
          postedDeliveryResponse.body as DeliveryNoteResponse;

        expect(
          postedDelivery.status,
        ).toBe('posted');

        const stockResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/items/${item.id}`,
            )
            .set(auth)
            .expect(200);

        const stock =
          stockResponse.body as ItemResponse;

        expect(
          Number(
            stock.currentStock,
          ),
        ).toBeCloseTo(
          8,
          3,
        );

        const invoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/sales-invoices`,
            )
            .set(auth)
            .send({
              customerId:
                customer.id,
              salesOrderId:
                salesOrder.id,
              deliveryNoteId:
                delivery.id,
              invoiceDate:
                date,
              dueDate,
              currency: 'EUR',
              shippingTotal:
                0,
              items: [
                {
                  itemId:
                    item.id,
                  salesOrderItemId:
                    salesOrder.items[0].id,
                  deliveryNoteItemId:
                    delivery.items[0].id,
                  quantity: 2,
                  unitPrice: 100,
                  discountPercent:
                    0,
                  taxPercent: 0,
                },
              ],
            })
            .expect(201);

        const invoice =
          invoiceResponse.body as SalesInvoiceResponse;

        expect(
          Number(
            invoice.grandTotal,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        const postedInvoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/sales-invoices/${invoice.id}/post`,
            )
            .set(auth)
            .expect(201);

        const postedInvoice =
          postedInvoiceResponse.body as SalesInvoiceResponse;

        expect(
          postedInvoice.status,
        ).toBe('posted');

        expect(
          Number(
            postedInvoice.balanceDue,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        const paymentResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/customer-payments`,
            )
            .set(auth)
            .send({
              customerId:
                customer.id,
              paymentDate:
                date,
              paymentMethod:
                'cash',
              currency: 'EUR',
              amount: 200,
              referenceNumber:
                `E2E-${runId}`,
              allocations: [
                {
                  salesInvoiceId:
                    invoice.id,
                  allocatedAmount:
                    200,
                },
              ],
            })
            .expect(201);

        const payment =
          paymentResponse.body as CustomerPaymentResponse;

        expect(
          payment.status,
        ).toBe('draft');

        const postedPaymentResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/customer-payments/${payment.id}/post`,
            )
            .set(auth)
            .expect(201);

        const postedPayment =
          postedPaymentResponse.body as CustomerPaymentResponse;

        expect(
          postedPayment.status,
        ).toBe('posted');

        const settledInvoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/sales-invoices/${invoice.id}`,
            )
            .set(auth)
            .expect(200);

        const settledInvoice =
          settledInvoiceResponse.body as SalesInvoiceResponse;

        expect(
          settledInvoice.status,
        ).toBe('paid');

        expect(
          Number(
            settledInvoice.balanceDue,
          ),
        ).toBeCloseTo(
          0,
          2,
        );

        const arLedgerResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/general-ledger/accounts/${accountsReceivableAccountId}`,
            )
            .query({
              dateFrom:
                date,
              dateTo:
                date,
              partyType:
                'customer',
              partyId:
                customer.id,
            })
            .set(auth)
            .expect(200);

        const arLedger =
          arLedgerResponse.body as AccountLedgerResponse;

        expect(
          Number(
            arLedger.totalDebit,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        expect(
          Number(
            arLedger.totalCredit,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        expect(
          Number(
            arLedger.closingBalance,
          ),
        ).toBeCloseTo(
          0,
          2,
        );

        const revenueLedgerResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/general-ledger/accounts/${salesRevenueAccountId}`,
            )
            .query({
              dateFrom:
                date,
              dateTo:
                date,
            })
            .set(auth)
            .expect(200);

        const revenueLedger =
          revenueLedgerResponse.body as AccountLedgerResponse;

        expect(
          Number(
            revenueLedger.totalCredit,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        const cashLedgerResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/general-ledger/accounts/${cashAccountId}`,
            )
            .query({
              dateFrom:
                date,
              dateTo:
                date,
            })
            .set(auth)
            .expect(200);

        const cashLedger =
          cashLedgerResponse.body as AccountLedgerResponse;

        expect(
          Number(
            cashLedger.totalDebit,
          ),
        ).toBeCloseTo(
          200,
          2,
        );

        const agedResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/aged-receivables`,
            )
            .query({
              asOfDate:
                date,
              customerId:
                customer.id,
              currency:
                'EUR',
              includeNotYetDue:
                true,
            })
            .set(auth)
            .expect(200);

        const aged =
          agedResponse.body as AgedReceivablesResponse;

        expect(
          Number(
            aged.totals.total,
          ),
        ).toBeCloseTo(
          0,
          2,
        );
      },
      120_000,
    );
  },
);
