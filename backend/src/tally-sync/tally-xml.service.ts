import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
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
          throw new BadRequestException(`Invalid rate for "${stockItemName}"`);
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
        <SVCURRENTCOMPANY>${this.escapeXml(tallyCompanyName)}</SVCURRENTCOMPANY>
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

  buildVoucherLookup(voucherType: string, voucherNumber: string): string {
    const company = this.escapeXml(this.getTallyCompanyName());
    const type = this.escapeXml(voucherType.trim());
    const number = this.escapeXml(voucherNumber.trim());

    return `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>TallySyncVoucherLookup</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="TallySyncVoucherLookup">
            <TYPE>Voucher</TYPE>
            <FETCH>VoucherNumber,VoucherTypeName,MasterID,GUID,Date,Reference</FETCH>
            <FILTER>TallySyncVoucherFilter</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="TallySyncVoucherFilter">
            $VoucherNumber = "${number}" AND $VoucherTypeName = "${type}"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`.trim();
  }

  buildPurchaseVoucher(input: {
    voucherNumber: string;
    voucherDate: string;
    supplierLedgerName: string;
    purchaseLedgerName: string;
    items: Array<{
      stockItemName: string;
      quantity: number;
      rate: number;
      unit: string;
      godownName: string;
    }>;
  }): TallySalesVoucherPreview {
    if (!input.items.length) {
      throw new BadRequestException('At least one purchase voucher item is required');
    }

    const date = this.formatTallyDate(input.voucherDate);
    const company = this.escapeXml(this.getTallyCompanyName());
    const voucherNumber = this.escapeXml(input.voucherNumber);
    const supplier = this.escapeXml(input.supplierLedgerName);
    const purchaseLedger = this.escapeXml(input.purchaseLedgerName);
    let totalAmount = 0;

    const inventoryEntries = input.items.map((item) => {
      const qty = Number(item.quantity);
      const rate = Number(item.rate);
      const amountValue = qty * rate;
      if (!item.stockItemName?.trim() || !item.unit?.trim() || qty <= 0 || rate < 0) {
        throw new BadRequestException('Invalid purchase voucher item');
      }
      totalAmount += amountValue;
      const amount = this.formatMoney(amountValue);
      return `
<ALLINVENTORYENTRIES.LIST>
  <STOCKITEMNAME>${this.escapeXml(item.stockItemName)}</STOCKITEMNAME>
  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
  <RATE>${this.formatMoney(rate)}/${this.escapeXml(item.unit)}</RATE>
  <AMOUNT>-${amount}</AMOUNT>
  <ACTUALQTY>${this.formatNumber(qty)} ${this.escapeXml(item.unit)}</ACTUALQTY>
  <BILLEDQTY>${this.formatNumber(qty)} ${this.escapeXml(item.unit)}</BILLEDQTY>
  <BATCHALLOCATIONS.LIST>
    <GODOWNNAME>${this.escapeXml(item.godownName)}</GODOWNNAME>
    <BATCHNAME>Primary Batch</BATCHNAME>
    <AMOUNT>-${amount}</AMOUNT>
    <ACTUALQTY>${this.formatNumber(qty)} ${this.escapeXml(item.unit)}</ACTUALQTY>
    <BILLEDQTY>${this.formatNumber(qty)} ${this.escapeXml(item.unit)}</BILLEDQTY>
  </BATCHALLOCATIONS.LIST>
  <ACCOUNTINGALLOCATIONS.LIST>
    <LEDGERNAME>${purchaseLedger}</LEDGERNAME>
    <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
    <AMOUNT>-${amount}</AMOUNT>
  </ACCOUNTINGALLOCATIONS.LIST>
</ALLINVENTORYENTRIES.LIST>`.trim();
    }).join('\n');

    const total = this.formatMoney(totalAmount);
    const xml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Import</TALLYREQUEST><TYPE>Data</TYPE><ID>Vouchers</ID></HEADER>
  <BODY>
    <DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY><IMPORTDUPS>@@DUPCOMBINE</IMPORTDUPS></STATICVARIABLES></DESC>
    <DATA><TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
        <DATE>${date}</DATE><EFFECTIVEDATE>${date}</EFFECTIVEDATE>
        <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME><VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
        <REFERENCE>${voucherNumber}</REFERENCE><PARTYLEDGERNAME>${supplier}</PARTYLEDGERNAME>
        <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW><OBJVIEW>Invoice Voucher View</OBJVIEW><ISINVOICE>Yes</ISINVOICE>
        <LEDGERENTRIES.LIST>
          <LEDGERNAME>${supplier}</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><ISPARTYLEDGER>Yes</ISPARTYLEDGER>
          <AMOUNT>${total}</AMOUNT>
          <BILLALLOCATIONS.LIST><NAME>${voucherNumber}</NAME><BILLTYPE>New Ref</BILLTYPE><AMOUNT>${total}</AMOUNT></BILLALLOCATIONS.LIST>
        </LEDGERENTRIES.LIST>
        ${inventoryEntries}
      </VOUCHER>
    </TALLYMESSAGE></DATA>
  </BODY>
</ENVELOPE>`.trim();

    return { voucherNumber: input.voucherNumber, voucherDate: date, totalAmount, itemCount: input.items.length, xml };
  }

  buildLedgerPaymentVoucher(input: {
    voucherType: 'Receipt' | 'Payment';
    voucherNumber: string;
    voucherDate: string;
    partyLedgerName: string;
    moneyLedgerName: string;
    amount: number;
    billReferences: Array<{ name: string; amount: number }>;
  }): TallySalesVoucherPreview {
    const amountValue = Number(input.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      throw new BadRequestException('Payment voucher amount must be greater than zero');
    }
    const company = this.escapeXml(this.getTallyCompanyName());
    const date = this.formatTallyDate(input.voucherDate);
    const number = this.escapeXml(input.voucherNumber);
    const party = this.escapeXml(input.partyLedgerName);
    const money = this.escapeXml(input.moneyLedgerName);
    const total = this.formatMoney(amountValue);
    const isReceipt = input.voucherType === 'Receipt';
    const partyAmount = isReceipt ? total : `-${total}`;
    const moneyAmount = isReceipt ? `-${total}` : total;
    const partyPositive = isReceipt ? 'No' : 'Yes';
    const moneyPositive = isReceipt ? 'Yes' : 'No';
    const bills = input.billReferences.map((ref) => {
      const allocation = this.formatMoney(Number(ref.amount));
      const signed = isReceipt ? allocation : `-${allocation}`;
      return `<BILLALLOCATIONS.LIST><NAME>${this.escapeXml(ref.name)}</NAME><BILLTYPE>Agst Ref</BILLTYPE><AMOUNT>${signed}</AMOUNT></BILLALLOCATIONS.LIST>`;
    }).join('');

    const xml = `
<ENVELOPE>
  <HEADER><VERSION>1</VERSION><TALLYREQUEST>Import</TALLYREQUEST><TYPE>Data</TYPE><ID>Vouchers</ID></HEADER>
  <BODY><DESC><STATICVARIABLES><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY><IMPORTDUPS>@@DUPCOMBINE</IMPORTDUPS></STATICVARIABLES></DESC>
    <DATA><TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="${input.voucherType}" ACTION="Create">
        <DATE>${date}</DATE><EFFECTIVEDATE>${date}</EFFECTIVEDATE><VOUCHERTYPENAME>${input.voucherType}</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${number}</VOUCHERNUMBER><REFERENCE>${number}</REFERENCE>
        <ALLLEDGERENTRIES.LIST><LEDGERNAME>${party}</LEDGERNAME><ISDEEMEDPOSITIVE>${partyPositive}</ISDEEMEDPOSITIVE><ISPARTYLEDGER>Yes</ISPARTYLEDGER><AMOUNT>${partyAmount}</AMOUNT>${bills}</ALLLEDGERENTRIES.LIST>
        <ALLLEDGERENTRIES.LIST><LEDGERNAME>${money}</LEDGERNAME><ISDEEMEDPOSITIVE>${moneyPositive}</ISDEEMEDPOSITIVE><AMOUNT>${moneyAmount}</AMOUNT></ALLLEDGERENTRIES.LIST>
      </VOUCHER>
    </TALLYMESSAGE></DATA>
  </BODY>
</ENVELOPE>`.trim();

    return { voucherNumber: input.voucherNumber, voucherDate: date, totalAmount: amountValue, itemCount: input.billReferences.length, xml };
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

  private requireTallyCompanyName(): string {
    const name = this.configService.get<string>('TALLY_COMPANY_NAME');
    if (name === undefined) {
      throw new ServiceUnavailableException(
        'Tally is not configured on the server: set TALLY_COMPANY_NAME in the backend environment.',
      );
    }
    return name;
  }

  private getTallyCompanyName(): string {
    const companyName = this.requireTallyCompanyName();

    if (!companyName.trim()) {
      throw new BadRequestException('TALLY_COMPANY_NAME must not be empty');
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
