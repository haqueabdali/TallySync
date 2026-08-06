import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  IsNull,
  Not,
  Repository,
} from 'typeorm';

import { AccountFilterDto } from './dto/account-filter.dto';
import {
  AccountResponseDto,
  AccountTreeNodeResponseDto,
  PaginatedAccountsResponseDto,
} from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AccountEntity } from './entities/account.entity';
import { AccountNormalBalance } from './enums/account-normal-balance.enum';
import { AccountStatus } from './enums/account-status.enum';
import { AccountType } from './enums/account-type.enum';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
  ) {}

  async create(
    dto: CreateAccountDto,
    companyId: string,
    userId: string,
  ): Promise<AccountResponseDto> {
    const code = this.normalizeCode(dto.code);
    const name = dto.name.trim();

    await this.ensureUniqueCode(code, companyId);

    let parent: AccountEntity | null = null;

    if (dto.parentId) {
      parent = await this.getEntity(dto.parentId, companyId);

      if (!parent.isGroup) {
        throw new BadRequestException(
          'The selected parent account must be a group account.',
        );
      }

      if (parent.status !== AccountStatus.ACTIVE) {
        throw new ConflictException(
          'The selected parent account is inactive.',
        );
      }

      if (parent.type !== dto.type) {
        throw new BadRequestException(
          'Parent and child accounts must have the same account type.',
        );
      }

      if (parent.normalBalance !== dto.normalBalance) {
        throw new BadRequestException(
          'Parent and child accounts must have the same normal balance.',
        );
      }
    }

    const isGroup = dto.isGroup ?? false;

    if (isGroup && dto.allowManualEntry === true) {
      throw new BadRequestException(
        'Group accounts cannot allow manual posting.',
      );
    }

    const account = this.accountRepository.create({
      companyId,
      code,
      name,
      type: dto.type,
      normalBalance: dto.normalBalance,
      status: dto.status ?? AccountStatus.ACTIVE,
      parentId: dto.parentId ?? null,
      isGroup,
      isSystemAccount: dto.isSystemAccount ?? false,
      allowManualEntry: isGroup
        ? false
        : (dto.allowManualEntry ?? true),
      currency: (dto.currency ?? 'EUR').toUpperCase(),
      description: this.optional(dto.description),
      createdBy: userId,
      updatedBy: userId,
    });

    return this.toResponse(
      await this.accountRepository.save(account),
    );
  }

  async findAll(
    filter: AccountFilterDto,
    companyId: string,
  ): Promise<PaginatedAccountsResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;

    const query = this.accountRepository
      .createQueryBuilder('account')
      .where('account.company_id = :companyId', {
        companyId,
      });

    if (filter.search?.trim()) {
      const search = `%${filter.search.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('account.code ILIKE :search', { search })
            .orWhere('account.name ILIKE :search', { search })
            .orWhere(
              'account.description ILIKE :search',
              { search },
            );
        }),
      );
    }

    if (filter.type) {
      query.andWhere('account.type = :type', {
        type: filter.type,
      });
    }

    if (filter.normalBalance) {
      query.andWhere(
        'account.normal_balance = :normalBalance',
        {
          normalBalance: filter.normalBalance,
        },
      );
    }

    if (filter.status) {
      query.andWhere('account.status = :status', {
        status: filter.status,
      });
    }

    if (filter.parentId) {
      query.andWhere('account.parent_id = :parentId', {
        parentId: filter.parentId,
      });
    }

    if (filter.isGroup !== undefined) {
      query.andWhere('account.is_group = :isGroup', {
        isGroup: filter.isGroup,
      });
    }

    if (filter.isSystemAccount !== undefined) {
      query.andWhere(
        'account.is_system_account = :isSystemAccount',
        {
          isSystemAccount: filter.isSystemAccount,
        },
      );
    }

    if (filter.allowManualEntry !== undefined) {
      query.andWhere(
        'account.allow_manual_entry = :allowManualEntry',
        {
          allowManualEntry: filter.allowManualEntry,
        },
      );
    }

    const sortColumns: Record<string, string> = {
      code: 'account.code',
      name: 'account.name',
      type: 'account.type',
      status: 'account.status',
      createdAt: 'account.created_at',
      updatedAt: 'account.updated_at',
    };

    query
      .orderBy(
        sortColumns[filter.sortBy] ?? 'account.code',
        filter.sortOrder,
      )
      .addOrderBy('account.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [accounts, total] = await query.getManyAndCount();
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: accounts.map((account) =>
        this.toResponse(account),
      ),
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

  async findTree(
    companyId: string,
  ): Promise<AccountTreeNodeResponseDto[]> {
    const accounts = await this.accountRepository.find({
      where: {
        companyId,
      },
      order: {
        code: 'ASC',
      },
    });

    const nodeMap = new Map<
      string,
      AccountTreeNodeResponseDto
    >();

    for (const account of accounts) {
      nodeMap.set(account.id, {
        ...this.toResponse(account),
        children: [],
      });
    }

    const roots: AccountTreeNodeResponseDto[] = [];

    for (const account of accounts) {
      const node = nodeMap.get(account.id);

      if (!node) {
        continue;
      }

      if (!account.parentId) {
        roots.push(node);
        continue;
      }

      const parent = nodeMap.get(account.parentId);

      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async findOne(
    id: string,
    companyId: string,
  ): Promise<AccountResponseDto> {
    return this.toResponse(await this.getEntity(id, companyId));
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
    companyId: string,
    userId: string,
  ): Promise<AccountResponseDto> {
    const account = await this.getEntity(id, companyId);

    if (account.isSystemAccount) {
      this.validateSystemAccountUpdate(account, dto);
    }

    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);

      await this.ensureUniqueCode(
        code,
        companyId,
        account.id,
      );

      account.code = code;
    }

    const nextType = dto.type ?? account.type;
    const nextNormalBalance =
      dto.normalBalance ?? account.normalBalance;
    const nextParentId =
      dto.parentId !== undefined
        ? dto.parentId
        : account.parentId;
    const nextIsGroup =
      dto.isGroup !== undefined
        ? dto.isGroup
        : account.isGroup;

    if (nextParentId) {
      if (nextParentId === account.id) {
        throw new BadRequestException(
          'An account cannot be its own parent.',
        );
      }

      const parent = await this.getEntity(
        nextParentId,
        companyId,
      );

      if (!parent.isGroup) {
        throw new BadRequestException(
          'The selected parent account must be a group account.',
        );
      }

      if (parent.status !== AccountStatus.ACTIVE) {
        throw new ConflictException(
          'The selected parent account is inactive.',
        );
      }

      if (parent.type !== nextType) {
        throw new BadRequestException(
          'Parent and child accounts must have the same account type.',
        );
      }

      if (parent.normalBalance !== nextNormalBalance) {
        throw new BadRequestException(
          'Parent and child accounts must have the same normal balance.',
        );
      }

      await this.ensureNoCircularReference(
        account.id,
        parent.id,
        companyId,
      );
    }

    if (
      dto.isGroup === false &&
      account.isGroup
    ) {
      const childCount = await this.accountRepository.count({
        where: {
          companyId,
          parentId: account.id,
        },
      });

      if (childCount > 0) {
        throw new ConflictException(
          'A group account with child accounts cannot be converted to a posting account.',
        );
      }
    }

    if (nextIsGroup && dto.allowManualEntry === true) {
      throw new BadRequestException(
        'Group accounts cannot allow manual posting.',
      );
    }

    if (dto.name !== undefined) {
      account.name = dto.name.trim();
    }

    if (dto.type !== undefined) {
      account.type = dto.type;
    }

    if (dto.normalBalance !== undefined) {
      account.normalBalance = dto.normalBalance;
    }

    if (dto.status !== undefined) {
      account.status = dto.status;
    }

    if (dto.parentId !== undefined) {
      account.parentId = dto.parentId ?? null;
    }

    if (dto.isGroup !== undefined) {
      account.isGroup = dto.isGroup;

      if (dto.isGroup) {
        account.allowManualEntry = false;
      }
    }

    if (dto.isSystemAccount !== undefined) {
      account.isSystemAccount = dto.isSystemAccount;
    }

    if (dto.allowManualEntry !== undefined) {
      account.allowManualEntry = nextIsGroup
        ? false
        : dto.allowManualEntry;
    }

    if (dto.currency !== undefined) {
      account.currency = dto.currency.toUpperCase();
    }

    if (dto.description !== undefined) {
      account.description = this.optional(dto.description);
    }

    account.updatedBy = userId;

    return this.toResponse(
      await this.accountRepository.save(account),
    );
  }

  async activate(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<AccountResponseDto> {
    const account = await this.getEntity(id, companyId);

    account.status = AccountStatus.ACTIVE;
    account.updatedBy = userId;

    return this.toResponse(
      await this.accountRepository.save(account),
    );
  }

  async deactivate(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<AccountResponseDto> {
    const account = await this.getEntity(id, companyId);

    if (account.isSystemAccount) {
      throw new ConflictException(
        'System accounts cannot be deactivated.',
      );
    }

    const activeChildren = await this.accountRepository.count({
      where: {
        companyId,
        parentId: account.id,
        status: AccountStatus.ACTIVE,
      },
    });

    if (activeChildren > 0) {
      throw new ConflictException(
        'Deactivate all child accounts first.',
      );
    }

    account.status = AccountStatus.INACTIVE;
    account.updatedBy = userId;

    return this.toResponse(
      await this.accountRepository.save(account),
    );
  }

  async remove(
    id: string,
    companyId: string,
  ): Promise<{ message: string }> {
    const account = await this.getEntity(id, companyId);

    if (account.isSystemAccount) {
      throw new ConflictException(
        'System accounts cannot be deleted.',
      );
    }

    const childCount = await this.accountRepository.count({
      where: {
        companyId,
        parentId: account.id,
      },
    });

    if (childCount > 0) {
      throw new ConflictException(
        'An account with child accounts cannot be deleted.',
      );
    }

    await this.accountRepository.softRemove(account);

    return {
      message: 'Account deleted successfully.',
    };
  }

  async seedDefaultAccounts(
    companyId: string,
    userId: string,
    currency = 'EUR',
  ): Promise<AccountResponseDto[]> {
    const existing = await this.accountRepository.count({
      where: { companyId },
    });

    if (existing > 0) {
      throw new ConflictException(
        'Chart of accounts already exists for this company.',
      );
    }

    const normalizedCurrency = currency.toUpperCase();

    const accounts = [
      this.makeSystemAccount(
        companyId,
        '1000',
        'Assets',
        AccountType.ASSET,
        AccountNormalBalance.DEBIT,
        true,
        null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '2000',
        'Liabilities',
        AccountType.LIABILITY,
        AccountNormalBalance.CREDIT,
        true,
        null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '3000',
        'Equity',
        AccountType.EQUITY,
        AccountNormalBalance.CREDIT,
        true,
        null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '4000',
        'Income',
        AccountType.INCOME,
        AccountNormalBalance.CREDIT,
        true,
        null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '5000',
        'Expenses',
        AccountType.EXPENSE,
        AccountNormalBalance.DEBIT,
        true,
        null,
        normalizedCurrency,
        userId,
      ),
    ];

    const savedRoots = await this.accountRepository.save(accounts);

    const rootByCode = new Map(
      savedRoots.map((account) => [account.code, account]),
    );

    const children = [
      this.makeSystemAccount(
        companyId,
        '1100',
        'Cash',
        AccountType.ASSET,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('1000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '1200',
        'Bank',
        AccountType.ASSET,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('1000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '1300',
        'Accounts Receivable',
        AccountType.ASSET,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('1000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '1400',
        'Inventory',
        AccountType.ASSET,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('1000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '2100',
        'Accounts Payable',
        AccountType.LIABILITY,
        AccountNormalBalance.CREDIT,
        false,
        rootByCode.get('2000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '2200',
        'Tax Payable',
        AccountType.LIABILITY,
        AccountNormalBalance.CREDIT,
        false,
        rootByCode.get('2000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '3100',
        'Owner Capital',
        AccountType.EQUITY,
        AccountNormalBalance.CREDIT,
        false,
        rootByCode.get('3000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '4100',
        'Sales Revenue',
        AccountType.INCOME,
        AccountNormalBalance.CREDIT,
        false,
        rootByCode.get('4000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '4200',
        'Sales Returns',
        AccountType.INCOME,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('4000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '5100',
        'Cost of Goods Sold',
        AccountType.EXPENSE,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('5000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
      this.makeSystemAccount(
        companyId,
        '5200',
        'Operating Expenses',
        AccountType.EXPENSE,
        AccountNormalBalance.DEBIT,
        false,
        rootByCode.get('5000')?.id ?? null,
        normalizedCurrency,
        userId,
      ),
    ];

    const savedChildren =
      await this.accountRepository.save(children);

    return [...savedRoots, ...savedChildren].map((account) =>
      this.toResponse(account),
    );
  }

  private async getEntity(
    id: string,
    companyId: string,
  ): Promise<AccountEntity> {
    const account = await this.accountRepository.findOne({
      where: {
        id,
        companyId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    return account;
  }

  private async ensureUniqueCode(
    code: string,
    companyId: string,
    excludedId?: string,
  ): Promise<void> {
    const existing = await this.accountRepository.findOne({
      where: {
        companyId,
        code,
        ...(excludedId ? { id: Not(excludedId) } : {}),
      },
      withDeleted: true,
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `Account code ${code} already exists.`,
      );
    }
  }

  private async ensureNoCircularReference(
    accountId: string,
    proposedParentId: string,
    companyId: string,
  ): Promise<void> {
    let currentId: string | null = proposedParentId;

    while (currentId) {
      if (currentId === accountId) {
        throw new BadRequestException(
          'Circular account hierarchy is not allowed.',
        );
      }

      const current = await this.accountRepository.findOne({
        where: {
          id: currentId,
          companyId,
        },
      });

      currentId = current?.parentId ?? null;
    }
  }

  private validateSystemAccountUpdate(
    account: AccountEntity,
    dto: UpdateAccountDto,
  ): void {
    if (
      dto.code !== undefined ||
      dto.type !== undefined ||
      dto.normalBalance !== undefined ||
      dto.parentId !== undefined ||
      dto.isGroup !== undefined ||
      dto.isSystemAccount === false
    ) {
      throw new ConflictException(
        'Core structure of a system account cannot be changed.',
      );
    }

    if (dto.status === AccountStatus.INACTIVE) {
      throw new ConflictException(
        'System accounts cannot be deactivated.',
      );
    }

    if (
      dto.allowManualEntry !== undefined &&
      dto.allowManualEntry !== account.allowManualEntry
    ) {
      throw new ConflictException(
        'Manual-entry setting of a system account cannot be changed.',
      );
    }
  }

  private makeSystemAccount(
    companyId: string,
    code: string,
    name: string,
    type: AccountType,
    normalBalance: AccountNormalBalance,
    isGroup: boolean,
    parentId: string | null,
    currency: string,
    userId: string,
  ): AccountEntity {
    return this.accountRepository.create({
      companyId,
      code,
      name,
      type,
      normalBalance,
      status: AccountStatus.ACTIVE,
      parentId,
      isGroup,
      isSystemAccount: true,
      allowManualEntry: !isGroup,
      currency,
      description: null,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private optional(value?: string): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private toResponse(
    account: AccountEntity,
  ): AccountResponseDto {
    return {
      id: account.id,
      companyId: account.companyId,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      status: account.status,
      parentId: account.parentId,
      isGroup: account.isGroup,
      isSystemAccount: account.isSystemAccount,
      allowManualEntry: account.allowManualEntry,
      currency: account.currency,
      description: account.description,
      createdBy: account.createdBy,
      updatedBy: account.updatedBy,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
    };
  }
}
