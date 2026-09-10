import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ItemEntity } from '../items/entities/item.entity';
import { ItemSyncStatus } from '../items/enums/item-sync-status.enum';
import { CustomerEntity } from '../sales-orders/entities/customer.entity';
import { TallyMasterService } from './tally-master.service';

export type CustomerMasterSyncResult = {
  success: true;
  customerId: string;
  customerName: string;
  tallyLedgerName: string;
  tallyLedgerId: string;
  tallyAlterId: string | null;
};

export type ItemMasterSyncResult = {
  success: true;
  itemId: string;
  itemName: string;
  tallyItemName: string;
  tallyStockItemId: string;
  tallyAlterId: string | null;
  syncStatus: ItemSyncStatus;
};

@Injectable()
export class TallySingleMasterSyncService {
  constructor(
    private readonly configService: ConfigService,
    private readonly tallyMasterService: TallyMasterService,

    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,

    @InjectRepository(ItemEntity)
    private readonly itemRepository: Repository<ItemEntity>,
  ) {}

  async syncCustomerMaster(
    customerId: string,
    companyId: string,
  ): Promise<CustomerMasterSyncResult> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        companyId,
        deletedAt: IsNull(),
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.isActive) {
      throw new BadRequestException(
        'Inactive customer cannot be synchronized to Tally',
      );
    }

    const ledgerName =
      customer.tallyLedgerName?.trim() || customer.name?.trim();

    if (!ledgerName) {
      throw new BadRequestException(
        'Customer does not have a valid Tally ledger name',
      );
    }

    await this.tallyMasterService.ensureLedgerMasters(
      [
        {
          name: ledgerName,
          parent: 'Sundry Debtors',
          isBillWise: true,
        },
      ],
      {
        forceVerify: true,
      },
    );

    const tallyLedger =
      await this.tallyMasterService.findLedgerMaster(ledgerName);

    if (!tallyLedger?.guid) {
      throw new BadGatewayException(
        `Tally ledger "${ledgerName}" was not returned with a GUID`,
      );
    }

    customer.tallyLedgerId = tallyLedger.guid.trim();
    customer.tallyLedgerName = tallyLedger.name.trim();
    customer.tallyAlterId = this.normalizeAlterId(tallyLedger.alterId);

    await this.customerRepository.save(customer);

    return {
      success: true,
      customerId: customer.id,
      customerName: customer.name,
      tallyLedgerName: customer.tallyLedgerName,
      tallyLedgerId: customer.tallyLedgerId,
      tallyAlterId: customer.tallyAlterId,
    };
  }

  async syncItemMaster(
    itemId: string,
    companyId: string,
  ): Promise<ItemMasterSyncResult> {
    const item = await this.itemRepository.findOne({
      where: {
        id: itemId,
        companyId,
        deletedAt: IsNull(),
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (!item.isActive) {
      throw new BadRequestException(
        'Inactive item cannot be synchronized to Tally',
      );
    }

    const itemName = item.tallyItemName?.trim() || item.name?.trim();

    if (!itemName) {
      throw new BadRequestException(
        'Item does not have a valid Tally stock-item name',
      );
    }

    try {
      const baseUnit = this.toTallyUnit(
        item.unit,
        this.configService.get<string>('TALLY_DEFAULT_UNIT', 'Nos').trim(),
      );

      const parent = this.configService
        .get<string>('TALLY_DEFAULT_STOCK_GROUP', 'Primary')
        .trim();

      await this.tallyMasterService.ensureStockItemMasters(
        [
          {
            name: itemName,
            parent,
            baseUnit,
          },
        ],
        {
          forceVerify: true,
        },
      );

      const tallyItem =
        await this.tallyMasterService.findStockItemMaster(itemName);

      if (!tallyItem?.guid) {
        throw new BadGatewayException(
          `Tally stock item "${itemName}" was not returned with a GUID`,
        );
      }

      item.tallyStockItemId = tallyItem.guid.trim();
      item.tallyItemName = tallyItem.name.trim();
      item.tallyAlterId = this.normalizeAlterId(tallyItem.alterId);

      item.syncStatus = ItemSyncStatus.SYNCED;
      item.syncError = null;
      item.lastSyncedAt = new Date();

      await this.itemRepository.save(item);

      return {
        success: true,
        itemId: item.id,
        itemName: item.name,
        tallyItemName: item.tallyItemName,
        tallyStockItemId: item.tallyStockItemId,
        tallyAlterId: item.tallyAlterId,
        syncStatus: item.syncStatus,
      };
    } catch (error: unknown) {
      item.syncStatus = ItemSyncStatus.FAILED;
      item.syncError = this.getErrorMessage(error);

      await this.itemRepository.save(item);

      throw error;
    }
  }

  private toTallyUnit(
    itemUnit: string | null | undefined,
    defaultUnit: string,
  ): string {
    const unit = itemUnit?.trim() || defaultUnit.trim();

    if (!unit) {
      throw new BadRequestException('Item does not have a valid unit');
    }

    if (unit.toUpperCase() === 'PCS') {
      return 'pcs';
    }

    return unit;
  }

  private normalizeAlterId(value: string | null): string | null {
    const normalized = value?.trim();

    if (!normalized || !/^\d+$/.test(normalized)) {
      return null;
    }

    return normalized;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message.substring(0, 4000);
    }

    if (typeof error === 'string') {
      return error.substring(0, 4000);
    }

    return 'Unknown Tally synchronization error';
  }
}
