import { PartialType } from '@nestjs/swagger';

import { CreateSalesReturnDto } from './create-sales-return.dto';

export class UpdateSalesReturnDto extends PartialType(
  CreateSalesReturnDto,
) {}
