import { BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TallyCacheService } from './tally-cache.service';
import { TallyHttpService } from './tally-http.service';
import { TallyMasterService } from './tally-master.service';
import { TallyParserService } from './tally-parser.service';

describe('TallyMasterService', () => {
  let service: TallyMasterService;

  let configService: {
    getOrThrow: jest.Mock;
  };

  let tallyHttpService: {
    postXml: jest.Mock;
  };

  let tallyParserService: {
    collectionContainsName: jest.Mock;
    parseMasterImportResponse: jest.Mock;
  };

  let tallyCacheService: {
    hasLedger: jest.Mock;
    rememberLedger: jest.Mock;
    hasStockItem: jest.Mock;
    rememberStockItem: jest.Mock;
    clear: jest.Mock;
  };

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn().mockReturnValue('Farhan Ltd Demo'),
    };

    tallyHttpService = {
      postXml: jest.fn(),
    };

    tallyParserService = {
      collectionContainsName: jest.fn(),
      parseMasterImportResponse: jest.fn(),
    };

    tallyCacheService = {
      hasLedger: jest.fn().mockReturnValue(false),
      rememberLedger: jest.fn(),
      hasStockItem: jest.fn().mockReturnValue(false),
      rememberStockItem: jest.fn(),
      clear: jest.fn(),
    };

    service = new TallyMasterService(
      configService as unknown as ConfigService,
      tallyHttpService as unknown as TallyHttpService,
      tallyParserService as unknown as TallyParserService,
      tallyCacheService as unknown as TallyCacheService,
    );
  });

  describe('ensureStockItemMasters', () => {
    const stockItem = {
      name: 'Test Product',
      parent: 'Primary',
      baseUnit: 'pcs',
    };

    it('returns an existing master without attempting creation', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(true);
      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      const result = await service.ensureStockItemMasters([stockItem], {
        forceVerify: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        success: true,
        masterType: 'Stock Item',
        masterName: 'Test Product',
        created: 0,
        altered: 0,
        ignored: 0,
      });

      expect(
        tallyParserService.parseMasterImportResponse,
      ).not.toHaveBeenCalled();
      expect(tallyCacheService.rememberStockItem).toHaveBeenCalledWith(
        'test product',
      );
    });

    it('accepts a stock item actually created by Tally', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(false);

      tallyParserService.parseMasterImportResponse.mockReturnValue({
        success: true,
        created: 1,
        altered: 0,
        ignored: 0,
        errors: 0,
        exceptions: 0,
        lineError: null,
      });

      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      const result = await service.ensureStockItemMasters([stockItem], {
        forceVerify: true,
      });

      expect(result[0]).toMatchObject({
        success: true,
        created: 1,
        altered: 0,
      });

      expect(tallyCacheService.rememberStockItem).toHaveBeenCalledWith(
        'test product',
      );
    });

    it('accepts a stock item altered by Tally', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(false);

      tallyParserService.parseMasterImportResponse.mockReturnValue({
        success: true,
        created: 0,
        altered: 1,
        ignored: 0,
        errors: 0,
        exceptions: 0,
        lineError: null,
      });

      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      const result = await service.ensureStockItemMasters([stockItem], {
        forceVerify: true,
      });

      expect(result[0]).toMatchObject({
        success: true,
        created: 0,
        altered: 1,
      });

      expect(tallyCacheService.rememberStockItem).toHaveBeenCalledWith(
        'test product',
      );
    });

    it('rejects IGNORED when the stock item was not found before creation', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(false);

      tallyParserService.parseMasterImportResponse.mockReturnValue({
        success: true,
        created: 0,
        altered: 0,
        ignored: 1,
        errors: 0,
        exceptions: 0,
        lineError: null,
      });

      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      await expect(
        service.ensureStockItemMasters([stockItem], { forceVerify: true }),
      ).rejects.toThrow(
        'Tally ignored stock item "Test Product" without creating or altering it',
      );

      expect(tallyCacheService.rememberStockItem).not.toHaveBeenCalled();
    });

    it('propagates the Tally line error and does not cache the stock item', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(false);

      tallyParserService.parseMasterImportResponse.mockReturnValue({
        success: false,
        created: 0,
        altered: 0,
        ignored: 0,
        errors: 1,
        exceptions: 0,
        lineError: 'Invalid stock item',
      });

      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      await expect(
        service.ensureStockItemMasters([stockItem], { forceVerify: true }),
      ).rejects.toThrow(
        'Unable to create Tally stock item "Test Product": Invalid stock item',
      );

      expect(tallyCacheService.rememberStockItem).not.toHaveBeenCalled();
    });
  });

  describe('ensureLedgerMasters', () => {
    const ledger = {
      name: 'Test Customer',
      parent: 'Sundry Debtors',
      isBillWise: true,
    };

    it('rejects IGNORED when the ledger was not found before creation', async () => {
      tallyParserService.collectionContainsName.mockReturnValue(false);

      tallyParserService.parseMasterImportResponse.mockReturnValue({
        success: true,
        created: 0,
        altered: 0,
        ignored: 1,
        errors: 0,
        exceptions: 0,
        lineError: null,
      });

      tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

      await expect(
        service.ensureLedgerMasters([ledger], { forceVerify: true }),
      ).rejects.toThrow(
        'Tally ignored ledger "Test Customer" without creating or altering it',
      );

      expect(tallyCacheService.rememberLedger).not.toHaveBeenCalled();
    });
  });

  it('throws BadGatewayException for an ignored nonexistent stock item', async () => {
    tallyParserService.collectionContainsName.mockReturnValue(false);

    tallyParserService.parseMasterImportResponse.mockReturnValue({
      success: true,
      created: 0,
      altered: 0,
      ignored: 1,
      errors: 0,
      exceptions: 0,
      lineError: null,
    });

    tallyHttpService.postXml.mockResolvedValue('<ENVELOPE />');

    await expect(
      service.ensureStockItemMasters(
        [
          {
            name: 'Ignored Product',
            parent: 'Primary',
            baseUnit: 'pcs',
          },
        ],
        { forceVerify: true },
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});
