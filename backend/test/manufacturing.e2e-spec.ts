/**
 * Manufacturing order-to-completion (service-level e2e).
 *
 * Hand-written against the real services and the real database. Stock in this
 * engine lives in moving-average cost balances (`inventory_cost_balances`),
 * not in `items.current_stock`, so every stock assertion reads those balances.
 *
 * Flow under test:
 *   BOM -> production order (DRAFT) -> release -> start -> material consumption
 *   (components down, WIP posted) -> finished-goods receipt (finished goods up,
 *   order auto-completes) -> retry-safe completion -> variance + cost reconciliation.
 *
 * NOTE: scripts/generate-manufacturing-e2e.ts can regenerate a todo scaffold at
 * this path. Do not run it over this file.
 */
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { BillOfMaterialsService } from '../src/bill-of-materials/bill-of-materials.service';
import { FinishedGoodsService } from '../src/finished-goods/finished-goods.service';
import { InventoryCostSourceType } from '../src/inventory-cost-engine/enums/inventory-cost-source-type.enum';
import { MovingAverageCostingService } from '../src/inventory-cost-engine/moving-average/moving-average-costing.service';
import { ManufacturingMrpService } from '../src/manufacturing-mrp/manufacturing-mrp.service';
import type { MrpPlanQueryDto } from '../src/manufacturing-mrp/dto/mrp-plan-query.dto';
import { MaterialConsumptionService } from '../src/material-consumption/material-consumption.service';
import { ProductionOrderStatus } from '../src/production-orders/enums/production-order-status.enum';
import { ProductionOrdersService } from '../src/production-orders/production-orders.service';
import { ProductionVarianceService } from '../src/production-variance/production-variance.service';

type Row = Record<string, string>;

const ACTOR = '00000000-0000-4000-8000-000000000001';
const TODAY = new Date().toISOString().slice(0, 10);

describe('Manufacturing Order-to-Completion (e2e)', () => {
  jest.setTimeout(180_000);

  let app: INestApplicationContext;
  let db: DataSource;
  let costing: MovingAverageCostingService;
  let boms: BillOfMaterialsService;
  let orders: ProductionOrdersService;
  let consumption: MaterialConsumptionService;
  let finishedGoods: FinishedGoodsService;
  let mrp: ManufacturingMrpService;
  let variances: ProductionVarianceService;

  const token = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const companies: string[] = [];

  // Company A fixture (filled in the first tests, shared afterwards).
  let companyId: string;
  let warehouseId: string;
  let compA: string; // plentiful component
  let compB: string; // scarce component
  let finished: string;
  let bomId: string;
  let order1: string; // happy path
  let order2: string; // rollback path
  let order1ComponentA: string;

  const id = async (sql: string, params: unknown[]): Promise<string> =>
    (await db.query<Row[]>(sql, params))[0].id;

  const qty = async (
    company: string,
    item: string,
    warehouse: string,
  ): Promise<number> => {
    const rows = await db.query<Row[]>(
      `SELECT quantity FROM inventory_cost_balances
        WHERE company_id=$1 AND item_id=$2 AND warehouse_id=$3`,
      [company, item, warehouse],
    );
    return rows.length ? Number(rows[0].quantity) : 0;
  };

  const journals = async (type: string, sourceId: string): Promise<number> =>
    Number(
      (
        await db.query<Row[]>(
          `SELECT COUNT(*)::text AS count FROM journal_entries
            WHERE company_id=$1 AND source_type=$2 AND source_id=$3 AND deleted_at IS NULL`,
          [companyId, type, sourceId],
        )
      )[0].count,
    );

  async function createCompany(label: string): Promise<string> {
    const company = await id(
      `INSERT INTO companies (name, tally_company_name) VALUES ($1,$2) RETURNING id`,
      [`MFG E2E ${label} ${token}`, `MFG-${label}-${token}`],
    );
    companies.push(company);
    return company;
  }

  async function receiveStock(
    company: string,
    item: string,
    warehouse: string,
    quantity: number,
    unitCost: number,
  ) {
    const source = await id(`SELECT gen_random_uuid() AS id`, []);
    await costing.recordReceipt({
      companyId: company,
      itemId: item,
      warehouseId: warehouse,
      transactionDate: TODAY,
      sourceType: InventoryCostSourceType.STOCK_ADJUSTMENT,
      sourceId: source,
      sourceLineId: source,
      quantity,
      unitCost,
      createdBy: ACTOR,
    });
  }

  beforeAll(async () => {
    const database =
      process.env.E2E_DATABASE_NAME ??
      process.env.DATABASE_NAME ??
      'tallysync_e2e_test';
    process.env.DATABASE_NAME = database;

    app = await NestFactory.createApplicationContext(AppModule, {
      abortOnError: false,
      logger: ['error'],
    });
    db = app.get(DataSource);
    expect((await db.query<Row[]>('SELECT current_database() AS d'))[0].d).toBe(
      database,
    );

    costing = app.get(MovingAverageCostingService);
    boms = app.get(BillOfMaterialsService);
    orders = app.get(ProductionOrdersService);
    consumption = app.get(MaterialConsumptionService);
    finishedGoods = app.get(FinishedGoodsService);
    mrp = app.get(ManufacturingMrpService);
    variances = app.get(ProductionVarianceService);
  });

  afterAll(async () => {
    if (db) {
      for (const company of companies) {
        const by = (table: string, column = 'company_id') =>
          db.query(`DELETE FROM ${table} WHERE ${column} = $1`, [company]);
        await db.query(
          `DELETE FROM journal_entry_lines WHERE journal_entry_id IN (SELECT id FROM journal_entries WHERE company_id=$1)`,
          [company],
        );
        await by('journal_entries');
        await db.query(
          `DELETE FROM production_variance_lines WHERE production_variance_id IN (SELECT id FROM production_variances WHERE company_id=$1)`,
          [company],
        );
        await by('production_variances');
        await by('manufacturing_wip_postings');
        await db.query(
          `DELETE FROM material_consumption_lines WHERE consumption_id IN (SELECT id FROM material_consumptions WHERE company_id=$1)`,
          [company],
        );
        await by('material_consumptions');
        await by('finished_goods_receipts');
        await by('inventory_cost_transactions');
        await by('inventory_cost_balances');
        await db.query(
          `DELETE FROM production_order_components WHERE production_order_id IN (SELECT id FROM production_orders WHERE company_id=$1)`,
          [company],
        );
        await by('production_orders');
        await db.query(
          `DELETE FROM bill_of_material_components WHERE bill_of_material_id IN (SELECT id FROM bills_of_material WHERE company_id=$1)`,
          [company],
        );
        await by('bills_of_material');
        await by('manufacturing_wip_accounting_settings');
        await by('accounting_settings');
        await by('items');
        await by('warehouses');
        await by('accounts');
        await db.query('DELETE FROM companies WHERE id = $1', [company]);
      }
    }
    if (app) await app.close();
  });

  it('creates raw-material and finished-good items with cost-balance-backed inventory', async () => {
    companyId = await createCompany('A');

    const types = (
      await db.query<Row[]>(
        `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='accounts_type_enum' ORDER BY e.enumsortorder`,
      )
    ).map((r) => r.v);
    const balances = (
      await db.query<Row[]>(
        `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='accounts_normal_balance_enum' ORDER BY e.enumsortorder`,
      )
    ).map((r) => r.v);
    const asset = types.find((v) => v.toLowerCase() === 'asset') ?? types[0];
    const expense = types.find((v) => v.toLowerCase() === 'expense') ?? asset;
    const debit =
      balances.find((v) => v.toLowerCase() === 'debit') ?? balances[0];
    const account = (code: string, name: string, type: string) =>
      id(
        `INSERT INTO accounts (company_id, code, name, type, normal_balance) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [companyId, `${code}-${token}`, name, type, debit],
      );
    const [rm, wip, fg, variance] = [
      await account('RM', 'Raw Materials', asset),
      await account('WIP', 'Work In Progress', asset),
      await account('FG', 'Finished Goods', asset),
      await account('VAR', 'Manufacturing Variance', expense),
    ];
    await db.query(
      `INSERT INTO accounting_settings (company_id, raw_materials_inventory_account_id, work_in_progress_account_id,
         finished_goods_inventory_account_id, manufacturing_variance_account_id,
         auto_post_material_consumption, auto_post_production_completion, auto_post_production_variance)
       VALUES ($1,$2,$3,$4,$5,true,true,true)`,
      [companyId, rm, wip, fg, variance],
    );
    await db.query(
      `INSERT INTO manufacturing_wip_accounting_settings (company_id, wip_account_id) VALUES ($1,$2)`,
      [companyId, wip],
    );

    warehouseId = await id(
      `INSERT INTO warehouses (company_id, warehouse_code, name) VALUES ($1,$2,'E2E Warehouse') RETURNING id`,
      [companyId, `WH-${token}`],
    );
    const item = (name: string) =>
      id(`INSERT INTO items (company_id, name) VALUES ($1,$2) RETURNING id`, [
        companyId,
        `${name} ${token}`,
      ]);
    compA = await item('Component A');
    compB = await item('Component B');
    finished = await item('Finished Good');

    await receiveStock(companyId, compA, warehouseId, 100, 5);
    await receiveStock(companyId, compB, warehouseId, 3, 4);

    expect(await qty(companyId, compA, warehouseId)).toBe(100);
    expect(await qty(companyId, compB, warehouseId)).toBe(3);
    expect(await qty(companyId, finished, warehouseId)).toBe(0);
  });

  it('creates a BOM using the current service/DTO contract', async () => {
    const bom = await boms.create(
      {
        finishedItemId: finished,
        code: `BOM-${token}`,
        name: `E2E BOM ${token}`,
        outputQuantity: 10,
        components: [
          { componentItemId: compA, quantity: 20 },
          { componentItemId: compB, quantity: 5 },
        ],
      },
      companyId,
      ACTOR,
    );
    expect(Number(bom.outputQuantity)).toBe(10);
    expect(bom.components).toHaveLength(2);

    // BOMs start as drafts; production orders require an ACTIVE BOM.
    await expect(
      orders.create(
        {
          orderNumber: `DRAFT-${token}`,
          billOfMaterialId: bom.id,
          warehouseId,
          plannedQuantity: 1,
        },
        companyId,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await boms.activate(bom.id, companyId, ACTOR);
    bomId = bom.id;
  });

  it('creates a production order and expands BOM demand for the planned quantity', async () => {
    const created = await orders.create(
      {
        orderNumber: `PO1-${token}`,
        billOfMaterialId: bomId,
        warehouseId,
        plannedQuantity: 10,
      },
      companyId,
      ACTOR,
    );
    order1 = created.id;
    expect(created.status).toBe(ProductionOrderStatus.DRAFT);
    const required = new Map(
      created.components.map((c) => [
        c.componentItemId,
        Number(c.requiredQuantity),
      ]),
    );
    expect(required.get(compA)).toBe(20);
    expect(required.get(compB)).toBe(5);
    order1ComponentA = created.components.find(
      (c) => c.componentItemId === compA,
    )!.id;

    // Scaling: half the planned quantity needs half the components.
    const half = await orders.create(
      {
        orderNumber: `PO-HALF-${token}`,
        billOfMaterialId: bomId,
        warehouseId,
        plannedQuantity: 5,
      },
      companyId,
      ACTOR,
    );
    expect(
      Number(
        half.components.find((c) => c.componentItemId === compA)!
          .requiredQuantity,
      ),
    ).toBe(10);

    // Duplicate order numbers are rejected.
    await expect(
      orders.create(
        {
          orderNumber: `PO1-${token}`,
          billOfMaterialId: bomId,
          warehouseId,
          plannedQuantity: 10,
        },
        companyId,
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('runs MRP twice without changing raw-material stock', async () => {
    const query = {
      shortagesOnly: false,
      page: 1,
      limit: 50,
    } as MrpPlanQueryDto;
    const before = [
      await qty(companyId, compA, warehouseId),
      await qty(companyId, compB, warehouseId),
    ];

    const first = await mrp.getPlan(companyId, query);
    const second = await mrp.getPlan(companyId, query);

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect([
      await qty(companyId, compA, warehouseId),
      await qty(companyId, compB, warehouseId),
    ]).toEqual(before);
  });

  it('starts the production order only through a valid lifecycle transition', async () => {
    // DRAFT cannot start directly.
    await expect(orders.start(order1, companyId, ACTOR)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect((await orders.release(order1, companyId, ACTOR)).status).toBe(
      ProductionOrderStatus.RELEASED,
    );
    expect((await orders.start(order1, companyId, ACTOR)).status).toBe(
      ProductionOrderStatus.IN_PROGRESS,
    );

    // IN_PROGRESS cannot be released again.
    await expect(
      orders.release(order1, companyId, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('consumes materials atomically and decreases component stock exactly once', async () => {
    const dto = {
      consumptionNumber: `MC1-${token}`,
      productionOrderId: order1,
      consumptionDate: TODAY,
      lines: [{ productionOrderComponentId: order1ComponentA, quantity: 20 }],
    };

    const created = await consumption.create(companyId, ACTOR, dto);
    expect(created.lines).toHaveLength(1);
    expect(await qty(companyId, compA, warehouseId)).toBe(80);
    expect(await journals('material_consumption', created.id)).toBe(1);

    // A retry with the same business key must not consume again.
    await expect(
      consumption.create(companyId, ACTOR, dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await qty(companyId, compA, warehouseId)).toBe(80);
    expect(await journals('material_consumption', created.id)).toBe(1);

    // Over-consuming a fully issued component is rejected.
    await expect(
      consumption.create(companyId, ACTOR, {
        ...dto,
        consumptionNumber: `MC1b-${token}`,
        lines: [{ productionOrderComponentId: order1ComponentA, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await qty(companyId, compA, warehouseId)).toBe(80);
  });

  it('rolls back every component mutation when one required component is insufficient', async () => {
    const created = await orders.create(
      {
        orderNumber: `PO2-${token}`,
        billOfMaterialId: bomId,
        warehouseId,
        plannedQuantity: 10,
      },
      companyId,
      ACTOR,
    );
    order2 = created.id;
    await orders.release(order2, companyId, ACTOR);
    const lineA = created.components.find(
      (c) => c.componentItemId === compA,
    )!.id;
    const lineB = created.components.find(
      (c) => c.componentItemId === compB,
    )!.id;

    // Component A is available (80 on hand) but B needs 5 with only 3 on hand.
    await expect(
      consumption.create(companyId, ACTOR, {
        consumptionNumber: `MC2-${token}`,
        productionOrderId: order2,
        consumptionDate: TODAY,
        lines: [
          { productionOrderComponentId: lineA, quantity: 10 },
          { productionOrderComponentId: lineB, quantity: 5 },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(await qty(companyId, compA, warehouseId)).toBe(80); // A's issue was rolled back
    expect(await qty(companyId, compB, warehouseId)).toBe(3);
    const rows = await db.query<Row[]>(
      `SELECT COUNT(*)::text AS count FROM material_consumptions WHERE company_id=$1 AND consumption_number=$2`,
      [companyId, `MC2-${token}`],
    );
    expect(Number(rows[0].count)).toBe(0);
    const consumed = await db.query<Row[]>(
      `SELECT consumed_quantity FROM production_order_components WHERE id=$1`,
      [lineA],
    );
    expect(Number(consumed[0].consumed_quantity)).toBe(0);
    // The failed attempt left the order untouched (still RELEASED).
    expect((await orders.findOne(order2, companyId)).status).toBe(
      ProductionOrderStatus.RELEASED,
    );
  });

  it('receives finished goods and completes production, increasing finished stock exactly once', async () => {
    const receipt = await finishedGoods.create(companyId, ACTOR, {
      receiptNumber: `FG1-${token}`,
      productionOrderId: order1,
      receiptDate: TODAY,
      quantity: 10,
    });

    expect(Number(receipt.quantity)).toBe(10);
    expect(Number(receipt.totalCost)).toBe(100); // 20 x 5 of consumed material
    expect(Number(receipt.unitCost)).toBe(10);
    expect(await qty(companyId, finished, warehouseId)).toBe(10);

    const done = await orders.findOne(order1, companyId);
    expect(done.status).toBe(ProductionOrderStatus.COMPLETED);
    expect(Number(done.completedQuantity)).toBe(10);

    // Receiving against a completed order is rejected and adds nothing.
    await expect(
      finishedGoods.create(companyId, ACTOR, {
        receiptNumber: `FG1b-${token}`,
        productionOrderId: order1,
        receiptDate: TODAY,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await qty(companyId, finished, warehouseId)).toBe(10);
  });

  it('retries completion without duplicating finished-goods stock or journals', async () => {
    const before = await qty(companyId, finished, warehouseId);
    const journalsBefore = await journals('production_completion', order1);

    const first = await orders.complete(order1, companyId, ACTOR);
    const second = await orders.complete(order1, companyId, ACTOR);

    expect(first.status).toBe(ProductionOrderStatus.COMPLETED);
    expect(second.status).toBe(ProductionOrderStatus.COMPLETED);
    expect(await qty(companyId, finished, warehouseId)).toBe(before);
    // Exactly one completion journal no matter how many times completion is retried.
    expect(journalsBefore).toBeLessThanOrEqual(1);
    expect(await journals('production_completion', order1)).toBe(1);

    // Consumption rolled its material cost into the order for the posting rule.
    const cost = await db.query<Row[]>(
      `SELECT actual_material_cost, actual_total_cost FROM production_orders WHERE id=$1`,
      [order1],
    );
    expect(Number(cost[0].actual_material_cost)).toBe(100);
    expect(Number(cost[0].actual_total_cost)).toBe(100);
  });

  it('rejects cross-company BOM, component and production references', async () => {
    const other = await createCompany('B');
    const otherWarehouse = await id(
      `INSERT INTO warehouses (company_id, warehouse_code, name) VALUES ($1,$2,'Other WH') RETURNING id`,
      [other, `WHB-${token}`],
    );
    const otherItem = await id(
      `INSERT INTO items (company_id, name) VALUES ($1,$2) RETURNING id`,
      [other, `Other Item ${token}`],
    );

    // Company B cannot build from company A's BOM (reported as "not found")...
    await expect(
      orders.create(
        {
          orderNumber: `X1-${token}`,
          billOfMaterialId: bomId,
          warehouseId: otherWarehouse,
          plannedQuantity: 1,
        },
        other,
        ACTOR,
      ),
    ).rejects.toThrow('Active bill of material not found');

    // ...nor use company A's warehouse with its own BOM.
    const ownBom = await boms.create(
      {
        finishedItemId: otherItem,
        code: `OB-${token}`,
        name: 'Other BOM',
        outputQuantity: 1,
        components: [
          {
            componentItemId: await id(
              `INSERT INTO items (company_id, name) VALUES ($1,$2) RETURNING id`,
              [other, `Other Comp ${token}`],
            ),
            quantity: 1,
          },
        ],
      },
      other,
      ACTOR,
    );
    await boms.activate(ownBom.id, other, ACTOR);
    await expect(
      orders.create(
        {
          orderNumber: `X2-${token}`,
          billOfMaterialId: ownBom.id,
          warehouseId,
          plannedQuantity: 1,
        },
        other,
        ACTOR,
      ),
    ).rejects.toThrow('Active warehouse not found');

    // A BOM cannot reference another company's items.
    await expect(
      boms.create(
        {
          finishedItemId: finished,
          code: `X3-${token}`,
          name: 'Leak',
          outputQuantity: 1,
          components: [{ componentItemId: compA, quantity: 1 }],
        },
        other,
        ACTOR,
      ),
    ).rejects.toThrow();

    // Company B cannot consume against or receive for company A's order.
    await expect(
      consumption.create(other, ACTOR, {
        consumptionNumber: `X4-${token}`,
        productionOrderId: order2,
        consumptionDate: TODAY,
        lines: [{ productionOrderComponentId: order1ComponentA, quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      finishedGoods.create(other, ACTOR, {
        receiptNumber: `X5-${token}`,
        productionOrderId: order2,
        receiptDate: TODAY,
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(orders.findOne(order1, other)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('calculates production variance deterministically and only once', async () => {
    const calculated = await variances.calculate(companyId, ACTOR, order1, {
      varianceDate: TODAY,
    });
    expect(calculated.productionOrderId).toBe(order1);
    // Material actually consumed (100) was fully capitalised into finished goods (100).
    expect(Number(calculated.wipVariance)).toBe(0);
    expect(Number(calculated.totalVariance)).toBe(0);

    await expect(
      variances.calculate(companyId, ACTOR, order1, {}),
    ).rejects.toThrow('Production variance has already been calculated');
  });

  it('reconciles actual production cost against the completed quantity', async () => {
    const consumed = await db.query<Row[]>(
      `SELECT COALESCE(SUM(l.total_cost),0)::text AS total
         FROM material_consumption_lines l JOIN material_consumptions c ON c.id = l.consumption_id
        WHERE c.company_id=$1 AND c.production_order_id=$2`,
      [companyId, order1],
    );
    const received = await db.query<Row[]>(
      `SELECT COALESCE(SUM(total_cost),0)::text AS cost, COALESCE(SUM(quantity),0)::text AS quantity
         FROM finished_goods_receipts WHERE company_id=$1 AND production_order_id=$2`,
      [companyId, order1],
    );
    const order = await orders.findOne(order1, companyId);

    expect(Number(consumed[0].total)).toBe(100);
    expect(Number(received[0].cost)).toBe(Number(consumed[0].total)); // nothing lost or double-counted
    expect(Number(received[0].quantity)).toBe(Number(order.completedQuantity));
    // Finished-goods inventory value equals the capitalised cost.
    const value = await db.query<Row[]>(
      `SELECT inventory_value FROM inventory_cost_balances WHERE company_id=$1 AND item_id=$2 AND warehouse_id=$3`,
      [companyId, finished, warehouseId],
    );
    expect(Number(value[0].inventory_value)).toBe(100);
  });
});
