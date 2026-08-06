import { PartialType } from '@nestjs/swagger';

import { CreateLandedCostDto } from './create-landed-cost.dto';

export class UpdateLandedCostDto extends PartialType(
  CreateLandedCostDto,
) {}
