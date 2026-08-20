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
  user: {
    id: string;
    companyId: string;
  };
}

interface IdResponse {
  id: string;
  [key: string]: unknown;
}

interface ItemResponse extends IdResponse {
  currentStock: number;
}

interface PurchaseOrderResponse
  extends IdResponse {
  status: string;
  grandTotal: number;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    receivedQuantity: number;
  }>;
}

interface GoodsReceiptResponse
  extends IdResponse {
  status: string;
  items: Array<{
    id: string;
    purchaseOrderItemId: string;
    itemId: string;
    acceptedQty: number;
  }>;
}

interface PurchaseInvoiceResponse
  extends IdResponse {
  status: string;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
}

interface SupplierPaymentResponse
  extends IdResponse {
  status: string;
  allocatedAmount: number;
  unallocatedAmount: number;
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

interface AgedPayablesResponse {
  totals: {
    total: number;
  };
  suppliers: Array<{
    supplierId: string;
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
      `Refusing to run Procure-to-Pay E2E against unsafe database "${databaseName}".`,
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
  const date =
    new Date(
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
  'Procure-to-Pay business flow (e2e)',
  () => {
    let app: INestApplication<App>;
    let dataSource: DataSource;

    let roleRepository:
      Repository<RoleEntity>;

    let companyRepository:
      Repository<CompanyEntity>;

    let userRepository:
      Repository<UserEntity>;

    let accountRepository:
      Repository<AccountEntity>;

    let settingsRepository:
      Repository<AccountingSettingsEntity>;

    let token: string;
    let companyId: string;
    let adminUserId: string;

    let accountsPayableAccountId:
      string;

    let inventoryAccountId:
      string;

    let cashAccountId:
      string;

    const password =
      'TallySync-P2P-E2E-Password-2026!';

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
        'tallysync-p2p-e2e-only-secret-never-production';

      process.env.BACKGROUND_JOBS_ENABLED =
        'false';

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
        if (
          migrationDataSource.isInitialized
        ) {
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
              'P2P E2E administrator role',
            isSystem: true,
          }),
        ));

      const company =
        await companyRepository.save(
          companyRepository.create({
            name:
              `P2P E2E Company ${runId}`,
            tallyCompanyName:
              `P2P E2E Company ${runId}`,
            isActive: true,
          }),
        );

      companyId =
        company.id;

      const user =
        await userRepository.save(
          userRepository.create({
            companyId,
            roleId: role.id,
            fullName:
              'P2P E2E Administrator',
            email:
              `p2p-${runId}@tallysync.test`,
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
                'Procure-to-Pay E2E account',
              createdBy:
                adminUserId,
              updatedBy:
                adminUserId,
            }),
          );

      const ap =
        await createAccount(
          `AP-${runId}`.slice(
            0,
            30,
          ),
          'E2E Accounts Payable',
          AccountType.LIABILITY,
          AccountNormalBalance.CREDIT,
        );

      const inventory =
        await createAccount(
          `INV-${runId}`.slice(
            0,
            30,
          ),
          'E2E Inventory',
          AccountType.ASSET,
          AccountNormalBalance.DEBIT,
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

      accountsPayableAccountId =
        ap.id;

      inventoryAccountId =
        inventory.id;

      cashAccountId =
        cash.id;

      await settingsRepository.save(
        settingsRepository.create({
          companyId,

          accountsReceivableAccountId:
            null,
          accountsPayableAccountId:
            ap.id,
          salesRevenueAccountId:
            null,
          salesReturnsAccountId:
            null,
          outputTaxAccountId:
            null,
          inputTaxAccountId:
            null,
          inventoryAccountId:
            inventory.id,
          costOfGoodsSoldAccountId:
            null,
          cashAccountId:
            cash.id,
          bankAccountId:
            null,
          cardClearingAccountId:
            null,
          goodsReceivedNotInvoicedAccountId:
            null,
          purchaseExpenseAccountId:
            inventory.id,
          roundingDifferenceAccountId:
            null,

          defaultCurrency:
            'EUR',

          autoPostSalesInvoices:
            true,
          autoPostCustomerPayments:
            true,
          autoPostSalesReturns:
            true,
          autoPostGoodsReceipts:
            true,

          autoPostPurchaseInvoices:
            true,
          autoPostSupplierPayments:
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
              `p2p-${runId}@tallysync.test`,
            password,
          })
          .expect(200);

      const body =
        login.body as LoginResponse;

      expect(
        body.user.companyId,
      ).toBe(companyId);

      token =
        body.accessToken;
    }, 120_000);

    afterAll(async () => {
      if (app) {
        await app.close();
      }
    });

    it(
      'runs supplier -> PO -> GRN -> invoice -> payment -> AP/GL',
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

        /*
         * 1. Supplier
         */
        const supplierResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/suppliers`,
            )
            .set(auth)
            .send({
              name:
                `P2P Supplier ${runId}`,
              email:
                `supplier-${runId}@tallysync.test`,
              currency: 'EUR',
              paymentTerms: 30,
              creditLimit:
                10_000,
              openingBalance:
                0,
              isActive: true,
            })
            .expect(201);

        const supplier =
          supplierResponse.body as IdResponse;

        /*
         * 2. Warehouse
         */
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
                `P2P Warehouse ${runId}`,
              isActive: true,
            })
            .expect(201);

        const warehouse =
          warehouseResponse.body as IdResponse;

        /*
         * 3. Inventory item starts at zero stock.
         */
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
                `P2P-${runId}`
                  .replace(
                    /[^A-Za-z0-9._/-]/g,
                    '-',
                  )
                  .slice(
                    0,
                    50,
                  ),
              name:
                `P2P Item ${runId}`,
              unit: 'PCS',
              purchasePrice:
                60,
              sellingPrice:
                100,
              taxRate: 0,
              openingStock: 0,
              minimumStock: 0,
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
        ).toBeCloseTo(
          0,
          3,
        );

        /*
         * 4. Purchase Order
         */
        const poResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/purchase-orders`,
            )
            .set(auth)
            .send({
              supplierId:
                supplier.id,
              warehouseId:
                warehouse.id,
              poDate: date,
              expectedDate:
                date,
              currency:
                'EUR',
              shippingTotal:
                0,
              items: [
                {
                  itemId:
                    item.id,
                  quantity: 5,
                  unitPrice: 60,
                  discountPercent:
                    0,
                  taxPercent: 0,
                },
              ],
            })
            .expect(201);

        const po =
          poResponse.body as PurchaseOrderResponse;

        expect(
          po.status,
        ).toBe('draft');

        expect(
          Number(
            po.grandTotal,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        expect(
          po.items,
        ).toHaveLength(1);

        /*
         * 5. Send PO
         */
        const sentPoResponse =
          await request(
            app.getHttpServer(),
          )
            .patch(
              `${api}/purchase-orders/${po.id}/send`,
            )
            .set(auth)
            .expect(200);

        const sentPo =
          sentPoResponse.body as PurchaseOrderResponse;

        expect(
          sentPo.status,
        ).toBe('sent');

        /*
         * 6. Goods Receipt
         */
        const grnResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/goods-receipts`,
            )
            .set(auth)
            .send({
              purchaseOrderId:
                po.id,
              warehouseId:
                warehouse.id,
              grnDate: date,
              items: [
                {
                  purchaseOrderItemId:
                    po.items[0].id,
                  itemId:
                    item.id,
                  receivedQty:
                    5,
                  acceptedQty:
                    5,
                  rejectedQty:
                    0,
                  unitCost:
                    60,
                },
              ],
            })
            .expect(201);

        const grn =
          grnResponse.body as GoodsReceiptResponse;

        expect(
          grn.status,
        ).toBe('Draft');

        /*
         * 7. Post GRN and verify stock increase.
         */
        const postedGrnResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/goods-receipts/${grn.id}/post`,
            )
            .set(auth)
            .expect(200);

        const postedGrn =
          postedGrnResponse.body as GoodsReceiptResponse;

        expect(
          postedGrn.status,
        ).toBe('Posted');

        const stockedItemResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/items/${item.id}`,
            )
            .set(auth)
            .expect(200);

        const stockedItem =
          stockedItemResponse.body as ItemResponse;

        expect(
          Number(
            stockedItem.currentStock,
          ),
        ).toBeCloseTo(
          5,
          3,
        );

        const receivedPoResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/purchase-orders/${po.id}`,
            )
            .set(auth)
            .expect(200);

        const receivedPo =
          receivedPoResponse.body as PurchaseOrderResponse;

        expect(
          receivedPo.status,
        ).toBe('received');

        /*
         * 8. Purchase Invoice
         */
        const invoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/purchase-invoices`,
            )
            .set(auth)
            .send({
              supplierId:
                supplier.id,
              purchaseOrderId:
                po.id,
              goodsReceiptId:
                grn.id,
              supplierInvoiceNumber:
                `SUP-${runId}`,
              invoiceDate:
                date,
              dueDate,
              currency:
                'EUR',
              shippingTotal:
                0,
              items: [
                {
                  itemId:
                    item.id,
                  purchaseOrderItemId:
                    po.items[0].id,
                  goodsReceiptItemId:
                    grn.items[0].id,
                  quantity:
                    5,
                  unitCost:
                    60,
                  discountPercent:
                    0,
                  taxPercent:
                    0,
                },
              ],
            })
            .expect(201);

        const invoice =
          invoiceResponse.body as PurchaseInvoiceResponse;

        expect(
          Number(
            invoice.grandTotal,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        /*
         * 9. Post Invoice + automatic accounting.
         */
        const postedInvoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/purchase-invoices/${invoice.id}/post`,
            )
            .set(auth)
            .expect(201);

        const postedInvoice =
          postedInvoiceResponse.body as PurchaseInvoiceResponse;

        expect(
          postedInvoice.status,
        ).toBe('Posted');

        expect(
          Number(
            postedInvoice.balanceDue,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        /*
         * 10. Supplier payment
         */
        const paymentResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/supplier-payments`,
            )
            .set(auth)
            .send({
              supplierId:
                supplier.id,
              paymentDate:
                date,
              paymentMethod:
                'Cash',
              amount: 300,
              currency:
                'EUR',
              referenceNumber:
                `PAY-${runId}`,
              allocations: [
                {
                  purchaseInvoiceId:
                    invoice.id,
                  allocatedAmount:
                    300,
                },
              ],
            })
            .expect(201);

        const payment =
          paymentResponse.body as SupplierPaymentResponse;

        expect(
          payment.status,
        ).toBe('Draft');

        /*
         * 11. Post payment + automatic accounting.
         */
        const postedPaymentResponse =
          await request(
            app.getHttpServer(),
          )
            .post(
              `${api}/supplier-payments/${payment.id}/post`,
            )
            .set(auth)
            .expect(201);

        const postedPayment =
          postedPaymentResponse.body as SupplierPaymentResponse;

        expect(
          postedPayment.status,
        ).toBe('Posted');

        expect(
          Number(
            postedPayment.allocatedAmount,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        expect(
          Number(
            postedPayment.unallocatedAmount,
          ),
        ).toBeCloseTo(
          0,
          2,
        );

        /*
         * 12. Invoice should now be paid.
         */
        const paidInvoiceResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/purchase-invoices/${invoice.id}`,
            )
            .set(auth)
            .expect(200);

        const paidInvoice =
          paidInvoiceResponse.body as PurchaseInvoiceResponse;

        expect(
          paidInvoice.status,
        ).toBe('Paid');

        expect(
          Number(
            paidInvoice.balanceDue,
          ),
        ).toBeCloseTo(
          0,
          2,
        );

        /*
         * 13. AP ledger:
         * Purchase invoice = credit 300
         * Supplier payment = debit 300
         * Closing AP = 0
         */
        const apLedgerResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/general-ledger/accounts/${accountsPayableAccountId}`,
            )
            .query({
              dateFrom:
                date,
              dateTo:
                date,
              partyType:
                'supplier',
              partyId:
                supplier.id,
            })
            .set(auth)
            .expect(200);

        const apLedger =
          apLedgerResponse.body as AccountLedgerResponse;

        expect(
          Number(
            apLedger.totalCredit,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        expect(
          Number(
            apLedger.totalDebit,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        expect(
          Number(
            apLedger.closingBalance,
          ),
        ).toBeCloseTo(
          0,
          2,
        );

        expect(
          apLedger.lines.some(
            (line) =>
              line.sourceType ===
                'purchase_invoice' &&
              line.sourceId ===
                invoice.id,
          ),
        ).toBe(true);

        expect(
          apLedger.lines.some(
            (line) =>
              line.sourceType ===
                'supplier_payment' &&
              line.sourceId ===
                payment.id,
          ),
        ).toBe(true);

        /*
         * 14. Inventory / purchase debit from invoice.
         */
        const inventoryLedgerResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/general-ledger/accounts/${inventoryAccountId}`,
            )
            .query({
              dateFrom:
                date,
              dateTo:
                date,
            })
            .set(auth)
            .expect(200);

        const inventoryLedger =
          inventoryLedgerResponse.body as AccountLedgerResponse;

        expect(
          Number(
            inventoryLedger.totalDebit,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        /*
         * 15. Cash payment credit.
         */
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
            cashLedger.totalCredit,
          ),
        ).toBeCloseTo(
          300,
          2,
        );

        /*
         * 16. Aged Payables should have no remaining invoice.
         */
        const agedResponse =
          await request(
            app.getHttpServer(),
          )
            .get(
              `${api}/aged-payables`,
            )
            .query({
              asOfDate:
                date,
              supplierId:
                supplier.id,
              currency:
                'EUR',
              includeNotYetDue:
                true,
            })
            .set(auth)
            .expect(200);

        const aged =
          agedResponse.body as AgedPayablesResponse;

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
