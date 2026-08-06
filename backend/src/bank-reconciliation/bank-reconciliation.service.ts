import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { AccountType } from '../accounts/enums/account-type.enum';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { BankReconciliationFilterDto } from './dto/bank-reconciliation-filter.dto';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { CreateBankReconciliationMatchDto } from './dto/create-bank-reconciliation-match.dto';
import { BankReconciliationEntity } from './entities/bank-reconciliation.entity';
import { BankReconciliationMatchEntity } from './entities/bank-reconciliation-match.entity';
import { BankStatementLineEntity } from './entities/bank-statement-line.entity';
import { BankReconciliationStatus } from './enums/bank-reconciliation-status.enum';
import { BankStatementLineStatus } from './enums/bank-statement-line-status.enum';

@Injectable()
export class BankReconciliationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(BankReconciliationEntity) private readonly reconciliationRepository: Repository<BankReconciliationEntity>,
    @InjectRepository(AccountEntity) private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async create(companyId: string, userId: string, dto: CreateBankReconciliationDto): Promise<BankReconciliationEntity> {
    if (dto.statementStartDate > dto.statementEndDate) throw new BadRequestException('Statement start date cannot be after statement end date');
    await this.validateBankAccount(companyId, dto.bankAccountId);
    const duplicate = await this.reconciliationRepository.findOne({ where: { companyId, statementReference: dto.statementReference.trim() } });
    if (duplicate) throw new ConflictException('Statement reference already exists');
    const movement = this.round(dto.lines.reduce((sum, line) => sum + line.amount, 0));
    const expectedClosing = this.round(dto.openingBalance + movement);
    if (!this.equal(expectedClosing, dto.closingBalance)) throw new BadRequestException(`Statement balance mismatch: opening balance plus transactions equals ${expectedClosing.toFixed(2)}`);
    return this.dataSource.transaction(async (manager) => {
      const reconciliationRepository = manager.getRepository(BankReconciliationEntity);
      const lineRepository = manager.getRepository(BankStatementLineEntity);
      const reconciliation = await reconciliationRepository.save(reconciliationRepository.create({
        companyId,
        bankAccountId: dto.bankAccountId,
        statementReference: dto.statementReference.trim(),
        statementStartDate: dto.statementStartDate,
        statementEndDate: dto.statementEndDate,
        openingBalance: this.round(dto.openingBalance),
        closingBalance: this.round(dto.closingBalance),
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        status: BankReconciliationStatus.DRAFT,
        notes: this.optional(dto.notes),
        createdBy: userId,
        reconciledBy: null,
        reconciledAt: null,
        deletedAt: null,
        lines: [],
      }));
      reconciliation.lines = await lineRepository.save(dto.lines.map((line) => lineRepository.create({
        reconciliationId: reconciliation.id,
        transactionDate: line.transactionDate,
        valueDate: line.valueDate ?? null,
        externalTransactionId: this.optional(line.externalTransactionId),
        reference: this.optional(line.reference),
        description: this.optional(line.description),
        amount: this.round(line.amount),
        matchedAmount: 0,
        status: BankStatementLineStatus.UNMATCHED,
        matches: [],
      })));
      return reconciliation;
    });
  }

  async list(companyId: string, filter: BankReconciliationFilterDto): Promise<{ data: BankReconciliationEntity[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const query = this.reconciliationRepository.createQueryBuilder('reconciliation')
      .leftJoinAndSelect('reconciliation.bankAccount', 'bankAccount')
      .where('reconciliation.company_id = :companyId', { companyId })
      .andWhere('reconciliation.deleted_at IS NULL');
    if (filter.bankAccountId) query.andWhere('reconciliation.bank_account_id = :bankAccountId', { bankAccountId: filter.bankAccountId });
    if (filter.status) query.andWhere('reconciliation.status = :status', { status: filter.status });
    query.orderBy('reconciliation.statement_end_date', 'DESC').addOrderBy('reconciliation.created_at', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await query.getManyAndCount();
    return { data, meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) } };
  }

  async get(companyId: string, id: string): Promise<BankReconciliationEntity> {
    const reconciliation = await this.reconciliationRepository.createQueryBuilder('reconciliation')
      .leftJoinAndSelect('reconciliation.bankAccount', 'bankAccount')
      .leftJoinAndSelect('reconciliation.lines', 'lines')
      .leftJoinAndSelect('lines.matches', 'matches')
      .leftJoinAndSelect('matches.journalEntryLine', 'journalEntryLine')
      .leftJoinAndSelect('journalEntryLine.journalEntry', 'journalEntry')
      .where('reconciliation.id = :id', { id })
      .andWhere('reconciliation.company_id = :companyId', { companyId })
      .andWhere('reconciliation.deleted_at IS NULL')
      .orderBy('lines.transaction_date', 'ASC')
      .addOrderBy('lines.id', 'ASC')
      .getOne();
    if (!reconciliation) throw new NotFoundException('Bank reconciliation not found');
    return reconciliation;
  }

  async match(companyId: string, userId: string, reconciliationId: string, statementLineId: string, dto: CreateBankReconciliationMatchDto): Promise<BankReconciliationEntity> {
    await this.dataSource.transaction(async (manager) => {
      const reconciliationRepository = manager.getRepository(BankReconciliationEntity);
      const lineRepository = manager.getRepository(BankStatementLineEntity);
      const matchRepository = manager.getRepository(BankReconciliationMatchEntity);
      const journalLineRepository = manager.getRepository(JournalEntryLineEntity);
      const reconciliation = await reconciliationRepository.findOne({ where: { id: reconciliationId, companyId }, lock: { mode: 'pessimistic_write' } });
      if (!reconciliation) throw new NotFoundException('Bank reconciliation not found');
      if (reconciliation.status === BankReconciliationStatus.RECONCILED || reconciliation.status === BankReconciliationStatus.CANCELLED) throw new ConflictException('Finalized reconciliation cannot be changed');
      const line = await lineRepository.findOne({ where: { id: statementLineId, reconciliationId }, lock: { mode: 'pessimistic_write' } });
      if (!line) throw new NotFoundException('Bank statement line not found');
      const journalLine = await journalLineRepository.createQueryBuilder('line')
        .innerJoinAndSelect('line.journalEntry', 'entry')
        .where('line.id = :id', { id: dto.journalEntryLineId })
        .andWhere('entry.company_id = :companyId', { companyId })
        .andWhere('entry.status = :status', { status: JournalEntryStatus.POSTED })
        .getOne();
      if (!journalLine) throw new NotFoundException('Posted journal entry line not found');
      if (journalLine.accountId !== reconciliation.bankAccountId) throw new BadRequestException('Journal entry line does not use the selected bank account');
      const duplicate = await matchRepository.findOne({ where: { statementLineId, journalEntryLineId: dto.journalEntryLineId } });
      if (duplicate) throw new ConflictException('Journal entry line is already matched to this statement line');
      const statementRemaining = this.round(Math.abs(line.amount) - line.matchedAmount);
      if (dto.amount > statementRemaining + 0.005) throw new BadRequestException('Match amount exceeds the unmatched statement amount');
      const journalAmount = this.round(Math.abs(journalLine.debit - journalLine.credit));
      const previouslyMatchedResult = await matchRepository.createQueryBuilder('match')
        .select('COALESCE(SUM(match.amount), 0)', 'total')
        .where('match.journal_entry_line_id = :journalEntryLineId', { journalEntryLineId: journalLine.id })
        .getRawOne<{ total: string }>();
      const journalRemaining = this.round(journalAmount - Number(previouslyMatchedResult?.total ?? 0));
      if (dto.amount > journalRemaining + 0.005) throw new BadRequestException('Match amount exceeds the unmatched journal amount');
      const statementDirection = Math.sign(line.amount);
      const journalDirection = Math.sign(journalLine.debit - journalLine.credit);
      if (statementDirection !== journalDirection) throw new BadRequestException('Statement and journal line directions do not match');
      await matchRepository.save(matchRepository.create({ statementLineId, journalEntryLineId: journalLine.id, amount: this.round(dto.amount), createdBy: userId }));
      line.matchedAmount = this.round(line.matchedAmount + dto.amount);
      line.status = this.lineStatus(line.amount, line.matchedAmount);
      await lineRepository.save(line);
      if (reconciliation.status === BankReconciliationStatus.DRAFT) { reconciliation.status = BankReconciliationStatus.IN_PROGRESS; await reconciliationRepository.save(reconciliation); }
    });
    return this.get(companyId, reconciliationId);
  }

  async unmatch(companyId: string, reconciliationId: string, statementLineId: string, matchId: string): Promise<BankReconciliationEntity> {
    await this.dataSource.transaction(async (manager) => {
      const reconciliationRepository = manager.getRepository(BankReconciliationEntity);
      const lineRepository = manager.getRepository(BankStatementLineEntity);
      const matchRepository = manager.getRepository(BankReconciliationMatchEntity);
      const reconciliation = await reconciliationRepository.findOne({ where: { id: reconciliationId, companyId }, lock: { mode: 'pessimistic_write' } });
      if (!reconciliation) throw new NotFoundException('Bank reconciliation not found');
      if (reconciliation.status === BankReconciliationStatus.RECONCILED || reconciliation.status === BankReconciliationStatus.CANCELLED) throw new ConflictException('Finalized reconciliation cannot be changed');
      const line = await lineRepository.findOne({ where: { id: statementLineId, reconciliationId }, lock: { mode: 'pessimistic_write' } });
      if (!line) throw new NotFoundException('Bank statement line not found');
      const match = await matchRepository.findOne({ where: { id: matchId, statementLineId } });
      if (!match) throw new NotFoundException('Reconciliation match not found');
      await matchRepository.remove(match);
      line.matchedAmount = this.round(Math.max(0, line.matchedAmount - match.amount));
      line.status = this.lineStatus(line.amount, line.matchedAmount);
      await lineRepository.save(line);
    });
    return this.get(companyId, reconciliationId);
  }

  async reconcile(companyId: string, userId: string, id: string): Promise<BankReconciliationEntity> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(BankReconciliationEntity);
      const reconciliation = await repository.findOne({ where: { id, companyId }, relations: { lines: true }, lock: { mode: 'pessimistic_write' } });
      if (!reconciliation) throw new NotFoundException('Bank reconciliation not found');
      if (reconciliation.status === BankReconciliationStatus.RECONCILED) return;
      if (reconciliation.status === BankReconciliationStatus.CANCELLED) throw new ConflictException('Cancelled reconciliation cannot be reconciled');
      const unmatched = reconciliation.lines.filter((line) => line.status !== BankStatementLineStatus.MATCHED);
      if (unmatched.length > 0) throw new BadRequestException(`${unmatched.length} statement line(s) are not fully matched`);
      reconciliation.status = BankReconciliationStatus.RECONCILED;
      reconciliation.reconciledBy = userId;
      reconciliation.reconciledAt = new Date();
      await repository.save(reconciliation);
    });
    return this.get(companyId, id);
  }

  private async validateBankAccount(companyId: string, accountId: string): Promise<void> {
    const account = await this.accountRepository.findOne({ where: { id: accountId, companyId } });
    if (!account) throw new NotFoundException('Bank account not found');
    if (account.type !== AccountType.ASSET) throw new BadRequestException('Bank account must be an asset account');
    if (account.status !== AccountStatus.ACTIVE || account.isGroup) throw new BadRequestException('Bank account must be an active posting account');
  }
  private lineStatus(amount: number, matchedAmount: number): BankStatementLineStatus {
    if (matchedAmount <= 0.005) return BankStatementLineStatus.UNMATCHED;
    return this.equal(Math.abs(amount), matchedAmount) ? BankStatementLineStatus.MATCHED : BankStatementLineStatus.PARTIALLY_MATCHED;
  }
  private optional(value?: string): string | null { const normalized = value?.trim(); return normalized ? normalized : null; }
  private round(value: number): number { return Math.round((value + Number.EPSILON) * 100) / 100; }
  private equal(left: number, right: number): boolean { return Math.abs(left - right) < 0.005; }
}
