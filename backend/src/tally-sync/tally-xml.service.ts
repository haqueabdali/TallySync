import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PreviewSalesVoucherDto } from './dto/preview-sales-voucher.dto';

export type TallySalesVoucherPreview = {
  voucherNumber: string;
  voucherDate: string;
  totalAmount: number;
  itemCount: number;
  xml: string;
};

@Injectable()
export class TallyXmlService {
  constructor(private readonly configService: ConfigService) {}

  buildSalesVoucher(dto: PreviewSalesVoucherDto): TallySalesVoucherPreview {
    this.validateVoucherDto(dto);

    const tallyCompanyName = this.getTallyCompanyName();
    const voucherDate = this.formatTallyDate(dto.voucherDate);

    const totalAmount = dto.items.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.rate);
    }, 0);

    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException(
        'Sales voucher total must be greater than zero',
      );
    }

    const total = this.formatMoney(totalAmount);

    const inventoryEntries = dto.items
      .map((item) => {
        const stockItemName = item.stockItemName?.trim();
        const unit = item.unit?.trim();
        const godownName =
          item.godownName?.trim() ||
          this.configService
            .get<string>('TALLY_DEFAULT_GODOWN', 'Main Location')
            .trim();

        if (!stockItemName) {
          throw new BadRequestException('Stock item name is required');
        }

        if (!unit) {
          throw new BadRequestException(
            `Unit is required for stock item "${stockItemName}"`,
          );
        }

        const quantityValue = Number(item.quantity);
        const rateValue = Number(item.rate);
        const itemAmount = quantityValue * rateValue;

        if (!Number.isFinite(quantityValue) || quantityValue <= 0) {
          throw new BadRequestException(
            `Invalid quantity for "${stockItemName}"`,
          );
        }

        if (!Number.isFinite(rateValue) || rateValue <= 0) {
          throw new BadRequestException(
            `Invalid rate for "${stockItemName}"`,
          );
        }

        if (!Number.isFinite(itemAmount) || itemAmount <= 0) {
          throw new BadRequestException(
            `Invalid amount for "${stockItemName}"`,
          );
        }

        const quantity = this.formatNumber(quantityValue);
        const rate = this.formatMoney(rateValue);
        const amount = this.formatMoney(itemAmount);

        return `
<ALLINVENTORYENTRIES.LIST>
  <STOCKITEMNAME>${this.escapeXml(stockItemName)}</STOCKITEMNAME>
  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
  <RATE>${rate}/${this.escapeXml(unit)}</RATE>
  <AMOUNT>${amount}</AMOUNT>
  <ACTUALQTY>${quantity} ${this.escapeXml(unit)}</ACTUALQTY>
  <BILLEDQTY>${quantity} ${this.escapeXml(unit)}</BILLEDQTY>

  <BATCHALLOCATIONS.LIST>
    <GODOWNNAME>${this.escapeXml(godownName)}</GODOWNNAME>
    <BATCHNAME>Primary Batch</BATCHNAME>
    <AMOUNT>${amount}</AMOUNT>
    <ACTUALQTY>${quantity} ${this.escapeXml(unit)}</ACTUALQTY>
    <BILLEDQTY>${quantity} ${this.escapeXml(unit)}</BILLEDQTY>
  </BATCHALLOCATIONS.LIST>

  <ACCOUNTINGALLOCATIONS.LIST>
    <LEDGERNAME>${this.escapeXml(dto.salesLedgerName)}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>${amount}</AMOUNT>
  </ACCOUNTINGALLOCATIONS.LIST>
</ALLINVENTORYENTRIES.LIST>
        `.trim();
      })
      .join('\n');

    const voucherNumber = this.escapeXml(dto.voucherNumber);
    const customerLedgerName = this.escapeXml(dto.customerLedgerName);

    const xml = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${this.escapeXml(
          tallyCompanyName,
        )}</SVCURRENTCOMPANY>
        <IMPORTDUPS>@@DUPCOMBINE</IMPORTDUPS>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER
          VCHTYPE="Sales"
          ACTION="Create"
          OBJVIEW="Invoice Voucher View"
        >
          <DATE>${voucherDate}</DATE>
          <EFFECTIVEDATE>${voucherDate}</EFFECTIVEDATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
          <REFERENCE>${voucherNumber}</REFERENCE>
          <PARTYLEDGERNAME>${customerLedgerName}</PARTYLEDGERNAME>
          <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
          <OBJVIEW>Invoice Voucher View</OBJVIEW>
          <ISINVOICE>Yes</ISINVOICE>

          <LEDGERENTRIES.LIST>
            <LEDGERNAME>${customerLedgerName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
            <ISLASTDEEMEDPOSITIVE>Yes</ISLASTDEEMEDPOSITIVE>
            <AMOUNT>-${total}</AMOUNT>
            <BILLALLOCATIONS.LIST>
              <NAME>${voucherNumber}</NAME>
              <BILLTYPE>New Ref</BILLTYPE>
              <AMOUNT>-${total}</AMOUNT>
            </BILLALLOCATIONS.LIST>
          </LEDGERENTRIES.LIST>

          ${inventoryEntries}
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
    `.trim();

    return {
      voucherNumber: dto.voucherNumber,
      voucherDate,
      totalAmount,
      itemCount: dto.items.length,
      xml,
    };
  }

  private validateVoucherDto(dto: PreviewSalesVoucherDto): void {
    if (!dto.voucherNumber?.trim()) {
      throw new BadRequestException('Voucher number is required');
    }

    if (!dto.voucherDate?.trim()) {
      throw new BadRequestException('Voucher date is required');
    }

    if (!dto.customerLedgerName?.trim()) {
      throw new BadRequestException('Customer ledger name is required');
    }

    if (!dto.salesLedgerName?.trim()) {
      throw new BadRequestException('Sales ledger name is required');
    }

    if (!dto.items?.length) {
      throw new BadRequestException(
        'At least one sales voucher item is required',
      );
    }
  }

  private getTallyCompanyName(): string {
    const companyName =
      this.configService.getOrThrow<string>('TALLY_COMPANY_NAME');

    if (!companyName.trim()) {
      throw new BadRequestException(
        'TALLY_COMPANY_NAME must not be empty',
      );
    }

    return companyName.trim();
  }

  private formatTallyDate(value: string): string {
    const date = new Date(`${value}T00:00:00.000Z`);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid voucher date');
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}${month}${day}`;
  }

  private formatMoney(value: number): string {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Invalid monetary value');
    }

    return value.toFixed(2);
  }

  private formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
      throw new BadRequestException('Invalid numeric value');
    }

    return Number.isInteger(value)
      ? String(value)
      : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  }

  private escapeXml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
