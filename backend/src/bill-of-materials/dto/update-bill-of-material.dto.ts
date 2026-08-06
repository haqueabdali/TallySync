import { PartialType } from '@nestjs/swagger';
import { CreateBillOfMaterialDto } from './create-bill-of-material.dto';

export class UpdateBillOfMaterialDto extends PartialType(
  CreateBillOfMaterialDto,
) {}
