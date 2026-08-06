import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { AccountEntity } from '../accounts/entities/account.entity';
import { AccountStatus } from '../accounts/enums/account-status.enum';
import { CustomerPaymentEntity } from '../customer-payments/entities/customer-payment.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { JournalEntrySourceType } from '../journal-entries/enums/journal-entry-source-type.enum';
import { JournalEntryStatus } from '../journal-entries/enums/journal-entry-status.enum';
import { JournalEntriesService } from '../journal-entries/journal-entries.service';
import { PurchaseInvoiceEntity } from '../purchase-invoices/entities/purchase-invoice.entity';
import { SalesInvoiceEntity } from '../sales-invoices/entities/sales-invoice.entity';
import { SalesReturnEntity } from '../sales-returns/entities/sales-return.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { PostSourceDocumentDto } from './dto/post-source-document.dto';
import { PostingPreviewRequestDto } from './dto/posting-preview-request.dto';
import { PostingPreviewResponseDto } from './dto/posting-preview-response.dto';
import { PostingResultResponseDto } from './dto/posting-result-response.dto';
import { ReverseSourceJournalDto } from './dto/reverse-source-journal.dto';
import { PostingDocument } from './interfaces/posting-document.interface';
import { CustomerPaymentPostingRule } from './posting-rules/customer-payment.rule';
import { PurchaseInvoicePostingRule } from './posting-rules/purchase-invoice.rule';
import { SalesInvoicePostingRule } from './posting-rules/sales-invoice.rule';
import { SalesReturnPostingRule } from './posting-rules/sales-return.rule';
import { SupplierPaymentPostingRule } from './posting-rules/supplier-payment.rule';
import { LandedCostPostingRule } from './posting-rules/landed-cost.rule';


@Injectable()
export class AccountingEngineService {
  constructor(
    @InjectRepository(JournalEntryEntity)
    private readonly journalEntryRepository: Repository<JournalEntryEntity>,

    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,

    private readonly journalEntriesService: JournalEntriesService,
    private readonly salesInvoicePostingRule: SalesInvoicePostingRule,
    private readonly customerPaymentPostingRule: CustomerPaymentPostingRule,
    private readonly salesReturnPostingRule: SalesReturnPostingRule,
    private readonly supplierPaymentPostingRule: SupplierPaymentPostingRule,
    private readonly purchaseInvoicePostingRule: PurchaseInvoicePostingRule,
    private readonly landedCostPostingRule: LandedCostPostingRule,
  ) {}

  async preview(
    dto: PostingPreviewRequestDto,
    companyId: string,
  ): Promise<PostingPreviewResponseDto> {
    const document = await this.buildPostingDocument(
      dto.sourceType,
      dto.sourceId,
      companyId,
    );

    await this.validatePostingDocument(document, companyId);

    return this.toPreviewResponse(document);
  }

  async post(
    dto: PostSourceDocumentDto,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    const existing = await this.findSourceJournal(
      dto.sourceType,
      dto.sourceId,
      companyId,
    );

    if (existing) {
      return {
        created: false,
        journalEntry: await this.journalEntriesService.findOne(
          existing.id,
          companyId,
        ),
      };
    }

    const document = await this.buildPostingDocument(
      dto.sourceType,
      dto.sourceId,
      companyId,
    );

    await this.validatePostingDocument(document, companyId);

    const draft = await this.journalEntriesService.create(
      {
        entryDate: document.entryDate,
        sourceType: document.sourceType,
        sourceId: document.sourceId,
        referenceNumber:
          document.referenceNumber ?? undefined,
        currency: document.currency,
        narration: document.narration ?? undefined,
        lines: document.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          description: line.description ?? undefined,
          partyType: line.partyType ?? undefined,
          partyId: line.partyId ?? undefined,
          costCenter: line.costCenter ?? undefined,
        })),
      },
      companyId,
      userId,
    );

    const posted = await this.journalEntriesService.post(
      draft.id,
      companyId,
      userId,
    );

    return {
      created: true,
      journalEntry: posted,
    };
  }

  async reverse(
    dto: ReverseSourceJournalDto,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    const journal = await this.findSourceJournal(
      dto.sourceType,
      dto.sourceId,
      companyId,
    );

    if (!journal) {
      throw new NotFoundException(
        'No posted journal entry exists for this source document.',
      );
    }

    if (journal.status === JournalEntryStatus.REVERSED) {
      if (!journal.reversalEntryId) {
        throw new ConflictException(
          'Source journal is marked as reversed but has no reversal entry.',
        );
      }

      return {
        created: false,
        journalEntry: await this.journalEntriesService.findOne(
          journal.reversalEntryId,
          companyId,
        ),
      };
    }

    if (journal.status !== JournalEntryStatus.POSTED) {
      throw new ConflictException(
        'Only posted source journals can be reversed.',
      );
    }

    const reversal = await this.journalEntriesService.reverse(
      journal.id,
      {
        reversalReason: dto.reversalReason,
        reversalDate: dto.reversalDate,
      },
      companyId,
      userId,
    );

    return {
      created: true,
      journalEntry: reversal,
    };
  }

  async postSalesInvoice(
    invoiceId: string,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    return this.post(
      {
        sourceType: JournalEntrySourceType.SALES_INVOICE,
        sourceId: invoiceId,
      },
      companyId,
      userId,
    );
  }

  async postCustomerPayment(
    paymentId: string,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    return this.post(
      {
        sourceType: JournalEntrySourceType.CUSTOMER_PAYMENT,
        sourceId: paymentId,
      },
      companyId,
      userId,
    );
  }

  async postSalesReturn(
    returnId: string,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    return this.post(
      {
        sourceType: JournalEntrySourceType.SALES_RETURN,
        sourceId: returnId,
      },
      companyId,
      userId,
    );
  }

  async postSupplierPayment(
    paymentId: string,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    return this.post(
      {
        sourceType: JournalEntrySourceType.SUPPLIER_PAYMENT,
        sourceId: paymentId,
      },
      companyId,
      userId,
    );
  }

  async postPurchaseInvoice(
    invoiceId: string,
    companyId: string,
    userId: string,
  ): Promise<PostingResultResponseDto> {
    return this.post(
      {
        sourceType: JournalEntrySourceType.PURCHASE_INVOICE,
        sourceId: invoiceId,
      },
      companyId,
      userId,
    );
  }

  

  private async buildPostingDocument(
    sourceType: JournalEntrySourceType,
    sourceId: string,
    companyId: string,
  ): Promise<PostingDocument> {
    switch (sourceType) {
      case JournalEntrySourceType.SALES_INVOICE: {
        const source: SalesInvoiceEntity =
          await this.salesInvoicePostingRule.load(
            sourceId,
            companyId,
          );

        return this.salesInvoicePostingRule.build(
          source,
          companyId,
        );
      }

      case JournalEntrySourceType.CUSTOMER_PAYMENT: {
        const source: CustomerPaymentEntity =
          await this.customerPaymentPostingRule.load(
            sourceId,
            companyId,
          );

        return this.customerPaymentPostingRule.build(
          source,
          companyId,
        );
      }

      case JournalEntrySourceType.SALES_RETURN: {
        const source: SalesReturnEntity =
          await this.salesReturnPostingRule.load(
            sourceId,
            companyId,
          );

        return this.salesReturnPostingRule.build(
          source,
          companyId,
        );
      }

      case JournalEntrySourceType.SUPPLIER_PAYMENT: {
        const source: SupplierPayment =
          await this.supplierPaymentPostingRule.load(
            sourceId,
            companyId,
          );

        return this.supplierPaymentPostingRule.build(
          source,
          companyId,
        );
      }

      case JournalEntrySourceType.PURCHASE_INVOICE: {
        const source: PurchaseInvoiceEntity =
          await this.purchaseInvoicePostingRule.load(
            sourceId,
            companyId,
          );

        return this.purchaseInvoicePostingRule.build(
          source,
          companyId,
        );
      }

      default:
        throw new BadRequestException(
          `Automatic posting is not implemented for source type "${sourceType}".`,
        );
    }
  }

  private async validatePostingDocument(
    document: PostingDocument,
    companyId: string,
  ): Promise<void> {
    if (document.companyId !== companyId) {
      throw new BadRequestException(
        'Posting document belongs to another company.',
      );
    }

    if (!document.lines || document.lines.length < 2) {
      throw new BadRequestException(
        'Posting document must contain at least two lines.',
      );
    }

    if (!document.currency || document.currency.length !== 3) {
      throw new BadRequestException(
        'Posting document currency must contain three characters.',
      );
    }

    const accountIds = [
      ...new Set(
        document.lines.map((line) => line.accountId),
      ),
    ];

    const accounts = await this.accountRepository.find({
      where: {
        id: In(accountIds),
      },
    });

    const accountMap = new Map(
      accounts.map((account) => [account.id, account]),
    );

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of document.lines) {
      const account = accountMap.get(line.accountId);

      if (!account || account.companyId !== companyId) {
        throw new NotFoundException(
          `Account ${line.accountId} was not found for this company.`,
        );
      }

      if (account.status !== AccountStatus.ACTIVE) {
        throw new ConflictException(
          `Account ${account.code} is inactive.`,
        );
      }

      if (account.isGroup) {
        throw new ConflictException(
          `Group account ${account.code} cannot receive postings.`,
        );
      }

      const debit = this.round(Number(line.debit ?? 0));
      const credit = this.round(Number(line.credit ?? 0));

      if (debit < 0 || credit < 0) {
        throw new BadRequestException(
          'Posting amounts cannot be negative.',
        );
      }

      if (
        (debit === 0 && credit === 0) ||
        (debit > 0 && credit > 0)
      ) {
        throw new BadRequestException(
          'Each posting line must contain either a debit or a credit amount.',
        );
      }

      if (
        (line.partyType && !line.partyId) ||
        (!line.partyType && line.partyId)
      ) {
        throw new BadRequestException(
          'partyType and partyId must be provided together.',
        );
      }

      totalDebit = this.round(totalDebit + debit);
      totalCredit = this.round(totalCredit + credit);
    }

    if (
      totalDebit <= 0 ||
      totalCredit <= 0 ||
      Math.abs(totalDebit - totalCredit) > 0.009
    ) {
      throw new BadRequestException(
        `Posting document is not balanced. Debit: ${totalDebit.toFixed(
          2,
        )}, Credit: ${totalCredit.toFixed(2)}.`,
      );
    }
  }

  private async findSourceJournal(
    sourceType: JournalEntrySourceType,
    sourceId: string,
    companyId: string,
  ): Promise<JournalEntryEntity | null> {
    return this.journalEntryRepository.findOne({
      where: {
        companyId,
        sourceType,
        sourceId,
      },
      relations: {
        lines: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private toPreviewResponse(
    document: PostingDocument,
  ): PostingPreviewResponseDto {
    const totalDebit = this.round(
      document.lines.reduce(
        (sum, line) => sum + Number(line.debit ?? 0),
        0,
      ),
    );

    const totalCredit = this.round(
      document.lines.reduce(
        (sum, line) => sum + Number(line.credit ?? 0),
        0,
      ),
    );

    return {
      companyId: document.companyId,
      sourceType: document.sourceType,
      sourceId: document.sourceId,
      entryDate: document.entryDate,
      referenceNumber:
        document.referenceNumber ?? null,
      currency: document.currency,
      narration: document.narration ?? null,
      totalDebit,
      totalCredit,
      isBalanced:
        Math.abs(totalDebit - totalCredit) <= 0.009,
      lines: document.lines.map((line) => ({
        accountId: line.accountId,
        debit: this.round(Number(line.debit ?? 0)),
        credit: this.round(Number(line.credit ?? 0)),
        description: line.description ?? null,
        partyType: line.partyType ?? null,
        partyId: line.partyId ?? null,
        costCenter: line.costCenter ?? null,
      })),
    };
  }

  private round(value: number): number {
    return Math.round(
      (value + Number.EPSILON) * 100,
    ) / 100;
  }
}
