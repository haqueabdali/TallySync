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
import { AccountingSettingsResponseDto } from './dto/accounting-settings-response.dto';
import {
  AccountingSettingValidationItemDto,
  AccountingSettingsValidationResponseDto,
} from './dto/accounting-settings-validation-response.dto';
import { SeedAccountingSettingsDto } from './dto/seed-accounting-settings.dto';
import { UpdateAccountingSettingsDto } from './dto/update-accounting-settings.dto';
import { AccountingSettingsEntity } from './entities/accounting-settings.entity';

type AccountField =
  | 'accountsReceivableAccountId'
  | 'accountsPayableAccountId'
  | 'salesRevenueAccountId'
  | 'salesReturnsAccountId'
  | 'outputTaxAccountId'
  | 'inputTaxAccountId'
  | 'inventoryAccountId'
  | 'costOfGoodsSoldAccountId'
  | 'cashAccountId'
  | 'bankAccountId'
  | 'cardClearingAccountId'
  | 'goodsReceivedNotInvoicedAccountId'
  | 'purchaseExpenseAccountId'
  | 'roundingDifferenceAccountId';

@Injectable()
export class AccountingSettingsService {
  private readonly accountFields: AccountField[] = [
    'accountsReceivableAccountId',
    'accountsPayableAccountId',
    'salesRevenueAccountId',
    'salesReturnsAccountId',
    'outputTaxAccountId',
    'inputTaxAccountId',
    'inventoryAccountId',
    'costOfGoodsSoldAccountId',
    'cashAccountId',
    'bankAccountId',
    'cardClearingAccountId',
    'goodsReceivedNotInvoicedAccountId',
    'purchaseExpenseAccountId',
    'roundingDifferenceAccountId',
  ];

  constructor(
    @InjectRepository(AccountingSettingsEntity)
    private readonly settingsRepository: Repository<AccountingSettingsEntity>,

    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async get(
    companyId: string,
  ): Promise<AccountingSettingsResponseDto> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      throw new NotFoundException(
        'Accounting settings have not been configured.',
      );
    }

    return this.toResponse(settings);
  }

  async update(
    dto: UpdateAccountingSettingsDto,
    companyId: string,
    userId: string,
  ): Promise<AccountingSettingsResponseDto> {
    let settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        companyId,
        defaultCurrency: 'EUR',
        autoPostSalesInvoices: true,
        autoPostCustomerPayments: true,
        autoPostSalesReturns: true,
        autoPostGoodsReceipts: true,
        createdBy: userId,
        updatedBy: userId,
      });
    }

    await this.validateAccountMappings(dto, companyId);

    for (const field of this.accountFields) {
      if (dto[field] !== undefined) {
        settings[field] = dto[field] ?? null;
      }
    }

    if (dto.defaultCurrency !== undefined) {
      settings.defaultCurrency =
        dto.defaultCurrency.toUpperCase();
    }

    if (dto.autoPostSalesInvoices !== undefined) {
      settings.autoPostSalesInvoices =
        dto.autoPostSalesInvoices;
    }

    if (dto.autoPostCustomerPayments !== undefined) {
      settings.autoPostCustomerPayments =
        dto.autoPostCustomerPayments;
    }

    if (dto.autoPostSalesReturns !== undefined) {
      settings.autoPostSalesReturns =
        dto.autoPostSalesReturns;
    }

    if (dto.autoPostGoodsReceipts !== undefined) {
      settings.autoPostGoodsReceipts =
        dto.autoPostGoodsReceipts;
    }

    settings.updatedBy = userId;

    return this.toResponse(
      await this.settingsRepository.save(settings),
    );
  }

  async seedDefaults(
    dto: SeedAccountingSettingsDto,
    companyId: string,
    userId: string,
  ): Promise<AccountingSettingsResponseDto> {
    const existing = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (existing) {
      throw new ConflictException(
        'Accounting settings already exist for this company.',
      );
    }

    const accounts = await this.accountRepository.find({
      where: {
        companyId,
        code: In([
          '1100',
          '1200',
          '1300',
          '1400',
          '2100',
          '2200',
          '4100',
          '4200',
          '5100',
        ]),
      },
    });

    const byCode = new Map(
      accounts.map((account) => [account.code, account]),
    );

    const enabled = dto.enableAutoPosting ?? true;

    const settings = this.settingsRepository.create({
      companyId,
      accountsReceivableAccountId:
        byCode.get('1300')?.id ?? null,
      accountsPayableAccountId:
        byCode.get('2100')?.id ?? null,
      salesRevenueAccountId:
        byCode.get('4100')?.id ?? null,
      salesReturnsAccountId:
        byCode.get('4200')?.id ?? null,
      outputTaxAccountId:
        byCode.get('2200')?.id ?? null,
      inputTaxAccountId:
        byCode.get('2200')?.id ?? null,
      inventoryAccountId:
        byCode.get('1400')?.id ?? null,
      costOfGoodsSoldAccountId:
        byCode.get('5100')?.id ?? null,
      cashAccountId:
        byCode.get('1100')?.id ?? null,
      bankAccountId:
        byCode.get('1200')?.id ?? null,
      cardClearingAccountId:
        byCode.get('1200')?.id ?? null,
      goodsReceivedNotInvoicedAccountId:
        byCode.get('2100')?.id ?? null,
      purchaseExpenseAccountId:
        byCode.get('5100')?.id ?? null,
      roundingDifferenceAccountId: null,
      defaultCurrency:
        (dto.defaultCurrency ?? 'EUR').toUpperCase(),
      autoPostSalesInvoices: enabled,
      autoPostCustomerPayments: enabled,
      autoPostSalesReturns: enabled,
      autoPostGoodsReceipts: enabled,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toResponse(
      await this.settingsRepository.save(settings),
    );
  }

  async validate(
    companyId: string,
  ): Promise<AccountingSettingsValidationResponseDto> {
    const settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      return {
        isComplete: false,
        items: this.accountFields.map((field) => ({
          field,
          accountId: null,
          isConfigured: false,
          isValid: false,
          message: 'Not configured.',
        })),
      };
    }

    const accountIds = this.accountFields
      .map((field) => settings[field])
      .filter((id): id is string => Boolean(id));

    const accounts = accountIds.length
      ? await this.accountRepository.find({
          where: {
            companyId,
            id: In(accountIds),
          },
        })
      : [];

    const accountMap = new Map(
      accounts.map((account) => [account.id, account]),
    );

    const items: AccountingSettingValidationItemDto[] =
      this.accountFields.map((field) => {
        const accountId = settings[field];

        if (!accountId) {
          return {
            field,
            accountId: null,
            isConfigured: false,
            isValid: false,
            message: 'Not configured.',
          };
        }

        const account = accountMap.get(accountId);

        if (!account) {
          return {
            field,
            accountId,
            isConfigured: true,
            isValid: false,
            message:
              'Mapped account does not exist for this company.',
          };
        }

        if (account.status !== AccountStatus.ACTIVE) {
          return {
            field,
            accountId,
            isConfigured: true,
            isValid: false,
            message: 'Mapped account is inactive.',
          };
        }

        if (account.isGroup) {
          return {
            field,
            accountId,
            isConfigured: true,
            isValid: false,
            message:
              'Mapped account is a group account and cannot receive postings.',
          };
        }

        return {
          field,
          accountId,
          isConfigured: true,
          isValid: true,
          message: null,
        };
      });

    return {
      isComplete: items.every((item) => item.isValid),
      items,
    };
  }

  private async validateAccountMappings(
    dto: UpdateAccountingSettingsDto,
    companyId: string,
  ): Promise<void> {
    const ids = this.accountFields
      .map((field) => dto[field])
      .filter((id): id is string => Boolean(id));

    if (!ids.length) {
      return;
    }

    const accounts = await this.accountRepository.find({
      where: {
        companyId,
        id: In(ids),
      },
    });

    const accountMap = new Map(
      accounts.map((account) => [account.id, account]),
    );

    for (const id of ids) {
      const account = accountMap.get(id);

      if (!account) {
        throw new NotFoundException(
          `Account ${id} was not found for this company.`,
        );
      }

      if (account.status !== AccountStatus.ACTIVE) {
        throw new ConflictException(
          `Account ${account.code} is inactive.`,
        );
      }

      if (account.isGroup) {
        throw new BadRequestException(
          `Group account ${account.code} cannot be used for automatic postings.`,
        );
      }
    }
  }

  private toResponse(
    settings: AccountingSettingsEntity,
  ): AccountingSettingsResponseDto {
    return {
      id: settings.id,
      companyId: settings.companyId,
      accountsReceivableAccountId:
        settings.accountsReceivableAccountId,
      accountsPayableAccountId:
        settings.accountsPayableAccountId,
      salesRevenueAccountId:
        settings.salesRevenueAccountId,
      salesReturnsAccountId:
        settings.salesReturnsAccountId,
      outputTaxAccountId:
        settings.outputTaxAccountId,
      inputTaxAccountId:
        settings.inputTaxAccountId,
      inventoryAccountId:
        settings.inventoryAccountId,
      costOfGoodsSoldAccountId:
        settings.costOfGoodsSoldAccountId,
      cashAccountId: settings.cashAccountId,
      bankAccountId: settings.bankAccountId,
      cardClearingAccountId:
        settings.cardClearingAccountId,
      goodsReceivedNotInvoicedAccountId:
        settings.goodsReceivedNotInvoicedAccountId,
      purchaseExpenseAccountId:
        settings.purchaseExpenseAccountId,
      roundingDifferenceAccountId:
        settings.roundingDifferenceAccountId,
      defaultCurrency: settings.defaultCurrency,
      autoPostSalesInvoices:
        settings.autoPostSalesInvoices,
      autoPostCustomerPayments:
        settings.autoPostCustomerPayments,
      autoPostSalesReturns:
        settings.autoPostSalesReturns,
      autoPostGoodsReceipts:
        settings.autoPostGoodsReceipts,
      createdBy: settings.createdBy,
      updatedBy: settings.updatedBy,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
