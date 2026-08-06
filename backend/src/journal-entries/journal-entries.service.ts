import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  Repository,
} from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalEntryFilterDto } from './dto/journal-entry-filter.dto';
import {
  JournalEntryLineResponseDto,
  JournalEntryResponseDto,
  PaginatedJournalEntriesResponseDto,
} from './dto/journal-entry-response.dto';
import { ReverseJournalEntryDto } from './dto/reverse-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { JournalEntryLineEntity } from './entities/journal-entry-line.entity';
import { JournalEntryEntity } from './entities/journal-entry.entity';
import { JournalEntrySourceType } from './enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from './enums/journal-entry-status.enum';

@Injectable()
export class JournalEntriesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,

    @InjectRepository(JournalEntryLineEntity)
    private readonly journalEntryLineRepository: Repository<JournalEntryLineEntity>,

    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async create(
    dto: CreateJournalEntryDto,
    companyId: string,
    userId: string,
  ): Promise<JournalEntryResponseDto> {
    await this.validateLines(
      dto.lines,
      companyId,
      dto.sourceType ?? JournalEntrySourceType.MANUAL,
    );

    const totals = this.calculateTotals(dto.lines);
    this.ensureBalanced(totals.totalDebit, totals.totalCredit);

    return this.dataSource.transaction(async (manager) => {
      const entryRepository =
        manager.getRepository(JournalEntryEntity);
      const lineRepository =
        manager.getRepository(JournalEntryLineEntity);

      const entry = entryRepository.create({
        companyId,
        entryNumber: await this.generateEntryNumber(
          companyId,
          dto.entryDate,
        ),
        entryDate: dto.entryDate,
        status: JournalEntryStatus.DRAFT,
        sourceType:
          dto.sourceType ?? JournalEntrySourceType.MANUAL,
        sourceId: dto.sourceId ?? null,
        referenceNumber: this.optional(dto.referenceNumber),
        currency: (dto.currency ?? 'EUR').toUpperCase(),
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        narration: this.optional(dto.narration),
        createdBy: userId,
        updatedBy: userId,
        postedBy: null,
        postedAt: null,
        reversedBy: null,
        reversedAt: null,
        reversalReason: null,
        reversalEntryId: null,
        lines: [],
      });

      const savedEntry = await entryRepository.save(entry);

      savedEntry.lines = dto.lines.map((line) =>
        lineRepository.create({
          journalEntryId: savedEntry.id,
          accountId: line.accountId,
          debit: this.round(line.debit ?? 0),
          credit: this.round(line.credit ?? 0),
          partyType: this.optional(line.partyType),
          partyId: line.partyId ?? null,
          costCenter: this.optional(line.costCenter),
          description: this.optional(line.description),
        }),
      );

      savedEntry.lines = await lineRepository.save(
        savedEntry.lines,
      );

      return this.toResponse(savedEntry);
    });
  }

  async findAll(
    filter: JournalEntryFilterDto,
    companyId: string,
  ): Promise<PaginatedJournalEntriesResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    const query = this.journalEntryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.lines', 'lines')
      .where('entry.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('entry.entry_number ILIKE :search', {
            search,
          })
            .orWhere(
              'entry.reference_number ILIKE :search',
              { search },
            )
            .orWhere('entry.narration ILIKE :search', {
              search,
            });
        }),
      );
    }

    if (filter.status) {
      query.andWhere('entry.status = :status', {
        status: filter.status,
      });
    }

    if (filter.sourceType) {
      query.andWhere('entry.source_type = :sourceType', {
        sourceType: filter.sourceType,
      });
    }

    if (filter.sourceId) {
      query.andWhere('entry.source_id = :sourceId', {
        sourceId: filter.sourceId,
      });
    }

    if (filter.accountId) {
      query.andWhere('lines.account_id = :accountId', {
        accountId: filter.accountId,
      });
    }

    if (filter.dateFrom) {
      query.andWhere('entry.entry_date >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('entry.entry_date <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    const sortColumns: Record<string, string> = {
      entryNumber: 'entry.entry_number',
      entryDate: 'entry.entry_date',
      totalDebit: 'entry.total_debit',
      totalCredit: 'entry.total_credit',
      createdAt: 'entry.created_at',
      updatedAt: 'entry.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'entry.created_at',
        filter.sortOrder,
      )
      .addOrderBy('entry.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true);

    const [entries, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: entries.map((entry) => this.toResponse(entry)),
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

  async findOne(
    id: string,
    companyId: string,
  ): Promise<JournalEntryResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateJournalEntryDto,
    companyId: string,
    userId: string,
  ): Promise<JournalEntryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const entryRepository =
        manager.getRepository(JournalEntryEntity);
      const lineRepository =
        manager.getRepository(JournalEntryLineEntity);

      const entry = await entryRepository.findOne({
        where: { id, companyId },
        relations: { lines: true },
      });

      if (!entry) {
        throw new NotFoundException('Journal entry not found.');
      }

      this.ensureDraft(entry);

      const nextSourceType =
        dto.sourceType ?? entry.sourceType;

      if (dto.lines) {
        await this.validateLines(
          dto.lines,
          companyId,
          nextSourceType,
        );

        const totals = this.calculateTotals(dto.lines);
        this.ensureBalanced(
          totals.totalDebit,
          totals.totalCredit,
        );

        await lineRepository.delete({
          journalEntryId: entry.id,
        });

        entry.lines = dto.lines.map((line) =>
          lineRepository.create({
            journalEntryId: entry.id,
            accountId: line.accountId,
            debit: this.round(line.debit ?? 0),
            credit: this.round(line.credit ?? 0),
            partyType: this.optional(line.partyType),
            partyId: line.partyId ?? null,
            costCenter: this.optional(line.costCenter),
            description: this.optional(line.description),
          }),
        );

        entry.lines = await lineRepository.save(entry.lines);
        entry.totalDebit = totals.totalDebit;
        entry.totalCredit = totals.totalCredit;
      }

      if (dto.entryDate !== undefined) {
        entry.entryDate = dto.entryDate;
      }

      if (dto.sourceType !== undefined) {
        entry.sourceType = dto.sourceType;
      }

      if (dto.sourceId !== undefined) {
        entry.sourceId = dto.sourceId ?? null;
      }

      if (dto.referenceNumber !== undefined) {
        entry.referenceNumber = this.optional(
          dto.referenceNumber,
        );
      }

      if (dto.currency !== undefined) {
        entry.currency = dto.currency.toUpperCase();
      }

      if (dto.narration !== undefined) {
        entry.narration = this.optional(dto.narration);
      }

      entry.updatedBy = userId;

      return this.toResponse(
        await entryRepository.save(entry),
      );
    });
  }

  async post(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<JournalEntryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const entryRepository =
        manager.getRepository(JournalEntryEntity);

      const entry = await entryRepository.findOne({
        where: { id, companyId },
        relations: { lines: true },
      });

      if (!entry) {
        throw new NotFoundException('Journal entry not found.');
      }

      this.ensureDraft(entry);

      if (entry.lines.length < 2) {
        throw new BadRequestException(
          'A journal entry must contain at least two lines.',
        );
      }

      await this.validateStoredLines(
        entry,
        companyId,
      );

      const totals = this.calculateTotals(entry.lines);
      this.ensureBalanced(
        totals.totalDebit,
        totals.totalCredit,
      );

      entry.totalDebit = totals.totalDebit;
      entry.totalCredit = totals.totalCredit;
      entry.status = JournalEntryStatus.POSTED;
      entry.postedBy = userId;
      entry.postedAt = new Date();
      entry.updatedBy = userId;

      return this.toResponse(
        await entryRepository.save(entry),
      );
    });
  }

  async reverse(
    id: string,
    dto: ReverseJournalEntryDto,
    companyId: string,
    userId: string,
  ): Promise<JournalEntryResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const entryRepository =
        manager.getRepository(JournalEntryEntity);
      const lineRepository =
        manager.getRepository(JournalEntryLineEntity);

      const original = await entryRepository.findOne({
        where: { id, companyId },
        relations: { lines: true },
      });

      if (!original) {
        throw new NotFoundException('Journal entry not found.');
      }

      if (original.status !== JournalEntryStatus.POSTED) {
        throw new ConflictException(
          'Only posted journal entries can be reversed.',
        );
      }

      if (original.reversalEntryId) {
        throw new ConflictException(
          'This journal entry has already been reversed.',
        );
      }

      const reversalDate =
        dto.reversalDate ?? original.entryDate;

      const reversal = entryRepository.create({
        companyId,
        entryNumber: await this.generateEntryNumber(
          companyId,
          reversalDate,
        ),
        entryDate: reversalDate,
        status: JournalEntryStatus.POSTED,
        sourceType: JournalEntrySourceType.OTHER,
        sourceId: original.id,
        referenceNumber: original.entryNumber,
        currency: original.currency,
        totalDebit: Number(original.totalCredit),
        totalCredit: Number(original.totalDebit),
        narration: `Reversal of ${original.entryNumber}: ${dto.reversalReason.trim()}`,
        createdBy: userId,
        updatedBy: userId,
        postedBy: userId,
        postedAt: new Date(),
        reversedBy: null,
        reversedAt: null,
        reversalReason: null,
        reversalEntryId: null,
        lines: [],
      });

      const savedReversal =
        await entryRepository.save(reversal);

      savedReversal.lines = original.lines.map((line) =>
        lineRepository.create({
          journalEntryId: savedReversal.id,
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
          partyType: line.partyType,
          partyId: line.partyId,
          costCenter: line.costCenter,
          description:
            line.description ??
            `Reversal of ${original.entryNumber}`,
        }),
      );

      savedReversal.lines = await lineRepository.save(
        savedReversal.lines,
      );

      original.status = JournalEntryStatus.REVERSED;
      original.reversedBy = userId;
      original.reversedAt = new Date();
      original.reversalReason =
        dto.reversalReason.trim();
      original.reversalEntryId = savedReversal.id;
      original.updatedBy = userId;

      await entryRepository.save(original);

      return this.toResponse(savedReversal);
    });
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<JournalEntryResponseDto> {
    const entry = await this.getEntity(id, companyId);

    if (entry.status === JournalEntryStatus.CANCELLED) {
      return this.toResponse(entry);
    }

    this.ensureDraft(entry);

    entry.status = JournalEntryStatus.CANCELLED;
    entry.updatedBy = userId;

    return this.toResponse(
      await this.journalEntryRepository.save(entry),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const entry = await this.getEntity(id, companyId);
    this.ensureDraft(entry);

    await this.journalEntryRepository.softRemove(entry);

    return {
      message: 'Journal entry deleted successfully.',
    };
  }

  private async validateLines(
    lines: CreateJournalEntryDto['lines'],
    companyId: string,
    sourceType: JournalEntrySourceType,
  ): Promise<void> {
    if (lines.length < 2) {
      throw new BadRequestException(
        'A journal entry must contain at least two lines.',
      );
    }

    for (const line of lines) {
      const debit = this.round(line.debit ?? 0);
      const credit = this.round(line.credit ?? 0);

      this.validateDebitCredit(debit, credit);

      const account = await this.accountRepository.findOne({
        where: {
          id: line.accountId,
          companyId,
        },
      });

      if (!account) {
        throw new NotFoundException(
          `Account ${line.accountId} not found.`,
        );
      }

      this.validateAccountForPosting(
        account,
        sourceType,
      );

      if (
        (line.partyType && !line.partyId) ||
        (!line.partyType && line.partyId)
      ) {
        throw new BadRequestException(
          'partyType and partyId must be provided together.',
        );
      }
    }
  }

  private async validateStoredLines(
    entry: JournalEntryEntity,
    companyId: string,
  ): Promise<void> {
    for (const line of entry.lines) {
      const debit = this.round(Number(line.debit));
      const credit = this.round(Number(line.credit));

      this.validateDebitCredit(debit, credit);

      const account = await this.accountRepository.findOne({
        where: {
          id: line.accountId,
          companyId,
        },
      });

      if (!account) {
        throw new NotFoundException(
          `Account ${line.accountId} not found.`,
        );
      }

      this.validateAccountForPosting(
        account,
        entry.sourceType,
      );

      if (
        (line.partyType && !line.partyId) ||
        (!line.partyType && line.partyId)
      ) {
        throw new BadRequestException(
          'partyType and partyId must be provided together.',
        );
      }
    }
  }

  private validateAccountForPosting(
    account: AccountEntity,
    sourceType: JournalEntrySourceType,
  ): void {
    if (account.status !== AccountStatus.ACTIVE) {
      throw new ConflictException(
        `Account ${account.code} is inactive.`,
      );
    }

    if (account.isGroup) {
      throw new BadRequestException(
        `Group account ${account.code} cannot receive journal postings.`,
      );
    }

    if (
      sourceType === JournalEntrySourceType.MANUAL &&
      !account.allowManualEntry
    ) {
      throw new ConflictException(
        `Manual posting is not allowed for account ${account.code}.`,
      );
    }
  }

  private validateDebitCredit(
    debit: number,
    credit: number,
  ): void {
    if (debit === 0 && credit === 0) {
      throw new BadRequestException(
        'Each journal line must contain either a debit or a credit amount.',
      );
    }

    if (debit > 0 && credit > 0) {
      throw new BadRequestException(
        'A journal line cannot contain both debit and credit amounts.',
      );
    }
  }

  private calculateTotals(
    lines: Array<{
      debit?: number | null;
      credit?: number | null;
    }>,
  ): {
    totalDebit: number;
    totalCredit: number;
  } {
    const totalDebit = this.round(
      lines.reduce(
        (sum, line) => sum + Number(line.debit ?? 0),
        0,
      ),
    );

    const totalCredit = this.round(
      lines.reduce(
        (sum, line) => sum + Number(line.credit ?? 0),
        0,
      ),
    );

    return {
      totalDebit,
      totalCredit,
    };
  }

  private ensureBalanced(
    totalDebit: number,
    totalCredit: number,
  ): void {
    if (totalDebit <= 0 || totalCredit <= 0) {
      throw new BadRequestException(
        'Journal entry totals must be greater than zero.',
      );
    }

    if (Math.abs(totalDebit - totalCredit) > 0.009) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debit: ${totalDebit.toFixed(
          2,
        )}, Credit: ${totalCredit.toFixed(2)}.`,
      );
    }
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<JournalEntryEntity> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id, companyId },
      relations: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found.');
    }

    return entry;
  }

  private ensureDraft(entry: JournalEntryEntity): void {
    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new ConflictException(
        'Only draft journal entries can be modified.',
      );
    }
  }

  private async generateEntryNumber(
    companyId: string,
    entryDate: string,
  ): Promise<string> {
    const year = new Date(entryDate).getUTCFullYear();
    const prefix = `JE-${year}-`;

    const latest = await this.journalEntryRepository
      .createQueryBuilder('entry')
      .withDeleted()
      .select('entry.entry_number', 'entryNumber')
      .where('entry.company_id = :companyId', {
        companyId,
      })
      .andWhere('entry.entry_number LIKE :prefix', {
        prefix: `${prefix}%`,
      })
      .orderBy('entry.entry_number', 'DESC')
      .getRawOne<{ entryNumber?: string }>();

    const current = latest?.entryNumber
      ? Number(latest.entryNumber.replace(prefix, ''))
      : 0;

    return `${prefix}${String(current + 1).padStart(
      6,
      '0',
    )}`;
  }

  private optional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private toLineResponse(
    line: JournalEntryLineEntity,
  ): JournalEntryLineResponseDto {
    return {
      id: line.id,
      accountId: line.accountId,
      debit: Number(line.debit),
      credit: Number(line.credit),
      partyType: line.partyType,
      partyId: line.partyId,
      costCenter: line.costCenter,
      description: line.description,
    };
  }

  private toResponse(
    entry: JournalEntryEntity,
  ): JournalEntryResponseDto {
    return {
      id: entry.id,
      companyId: entry.companyId,
      entryNumber: entry.entryNumber,
      entryDate: entry.entryDate,
      status: entry.status,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      referenceNumber: entry.referenceNumber,
      currency: entry.currency,
      totalDebit: Number(entry.totalDebit),
      totalCredit: Number(entry.totalCredit),
      narration: entry.narration,
      lines: (entry.lines ?? []).map((line) =>
        this.toLineResponse(line),
      ),
      createdBy: entry.createdBy,
      updatedBy: entry.updatedBy,
      postedBy: entry.postedBy,
      postedAt: entry.postedAt,
      reversedBy: entry.reversedBy,
      reversedAt: entry.reversedAt,
      reversalReason: entry.reversalReason,
      reversalEntryId: entry.reversalEntryId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      deletedAt: entry.deletedAt,
    };
  }
}
