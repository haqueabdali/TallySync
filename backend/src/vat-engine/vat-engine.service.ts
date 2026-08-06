import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreateVatReturnDto } from './dto/create-vat-return.dto';
import { VatReturnFilterDto } from './dto/vat-return-filter.dto';
import { VatReturnEntity } from './entities/vat-return.entity';
import { VatReturnLineEntity } from './entities/vat-return-line.entity';
import { VatDirection } from './enums/vat-direction.enum';
import { VatReturnStatus } from './enums/vat-return-status.enum';

interface VatAggregateRow {
  taxPercent: string | number;
  taxableAmount: string | number;
  taxAmount: string | number;
}

const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class VatEngineService {
  constructor(
    @InjectRepository(VatReturnEntity)
    private readonly returns: Repository<VatReturnEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateVatReturnDto, companyId: string, userId: string): Promise<VatReturnEntity> {
    if (dto.periodStart > dto.periodEnd) {
      throw new BadRequestException('periodStart must not be after periodEnd');
    }
    const duplicate = await this.returns.findOne({
      where: { companyId, periodStart: dto.periodStart, periodEnd: dto.periodEnd },
    });
    if (duplicate) throw new ConflictException('A VAT return already exists for this exact period');

    return this.dataSource.transaction(async (manager) => {
      const output = await this.query(manager, 'sales_invoice_items', 'sales_invoices', 'sales_invoice_id', 'invoice_date', "('posted','partially_paid','paid')", companyId, dto.periodStart, dto.periodEnd);
      const outputReturns = await this.query(manager, 'sales_return_items', 'sales_returns', 'sales_return_id', 'return_date', "('posted')", companyId, dto.periodStart, dto.periodEnd);
      const input = await this.query(manager, 'purchase_invoice_items', 'purchase_invoices', 'purchase_invoice_id', 'invoice_date', "('Posted','PartiallyPaid','Paid')", companyId, dto.periodStart, dto.periodEnd);
      const inputReturns = await this.query(manager, 'purchase_return_items', 'purchase_returns', 'purchase_return_id', 'return_date', "('Posted')", companyId, dto.periodStart, dto.periodEnd);

      const lines = [
        ...this.aggregate(manager, output, outputReturns, VatDirection.OUTPUT),
        ...this.aggregate(manager, input, inputReturns, VatDirection.INPUT),
      ];
      const outputTax = round2(lines.filter((line) => line.direction === VatDirection.OUTPUT).reduce((sum, line) => sum + line.taxAmount, 0));
      const inputTax = round2(lines.filter((line) => line.direction === VatDirection.INPUT).reduce((sum, line) => sum + line.taxAmount, 0));
      return manager.save(manager.create(VatReturnEntity, {
        companyId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        status: VatReturnStatus.DRAFT,
        outputTax,
        inputTax,
        netTaxPayable: round2(outputTax - inputTax),
        notes: dto.notes ?? null,
        createdBy: userId,
        finalizedBy: null,
        finalizedAt: null,
        lines,
      }));
    });
  }

  private query(manager: EntityManager, itemTable: string, headerTable: string, foreignKey: string, dateColumn: string, statuses: string, companyId: string, start: string, end: string): Promise<VatAggregateRow[]> {
    return manager.query<VatAggregateRow[]>(
      `SELECT i.tax_percent AS "taxPercent", SUM(i.line_subtotal - i.discount_amount) AS "taxableAmount", SUM(i.tax_amount) AS "taxAmount" FROM ${itemTable} i INNER JOIN ${headerTable} h ON h.id = i.${foreignKey} WHERE h.company_id = $1 AND h.deleted_at IS NULL AND h.status IN ${statuses} AND h.${dateColumn} BETWEEN $2 AND $3 GROUP BY i.tax_percent`,
      [companyId, start, end],
    );
  }

  private aggregate(manager: EntityManager, positive: VatAggregateRow[], negative: VatAggregateRow[], direction: VatDirection): VatReturnLineEntity[] {
    const map = new Map<number, { base: number; tax: number }>();
    for (const row of positive) this.add(map, row, 1);
    for (const row of negative) this.add(map, row, -1);
    return [...map.entries()].map(([taxPercent, value]) => manager.create(VatReturnLineEntity, {
      direction,
      taxPercent,
      taxableAmount: round2(value.base),
      taxAmount: round2(value.tax),
    }));
  }

  private add(map: Map<number, { base: number; tax: number }>, row: VatAggregateRow, sign: 1 | -1): void {
    const rate = Number(row.taxPercent);
    const value = map.get(rate) ?? { base: 0, tax: 0 };
    value.base += Number(row.taxableAmount) * sign;
    value.tax += Number(row.taxAmount) * sign;
    map.set(rate, value);
  }

  async findAll(companyId: string, query: VatReturnFilterDto) {
    const [data, total] = await this.returns.findAndCount({
      where: { companyId, ...(query.status ? { status: query.status } : {}) },
      order: { periodEnd: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return { data, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string, companyId: string): Promise<VatReturnEntity> {
    const item = await this.returns.findOne({ where: { id, companyId }, relations: { lines: true } });
    if (!item) throw new NotFoundException('VAT return not found');
    return item;
  }

  async finalize(id: string, companyId: string, userId: string): Promise<VatReturnEntity> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(VatReturnEntity);
      const item = await repository.createQueryBuilder('vatReturn')
        .setLock('pessimistic_write')
        .where('vatReturn.id = :id AND vatReturn.companyId = :companyId', { id, companyId })
        .getOne();
      if (!item) throw new NotFoundException('VAT return not found');
      if (item.status !== VatReturnStatus.DRAFT) throw new BadRequestException('Only draft VAT returns can be finalized');
      item.status = VatReturnStatus.FINALIZED;
      item.finalizedBy = userId;
      item.finalizedAt = new Date();
      return repository.save(item);
    });
  }
}
