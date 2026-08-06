import { PartialType } from '@nestjs/swagger';
import { CreatePurchaseInvoiceDto } from './create-purchase-invoice.dto';

export class UpdatePurchaseInvoiceDto extends PartialType(
  CreatePurchaseInvoiceDto,
) {}
