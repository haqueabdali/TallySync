import { PartialType } from '@nestjs/swagger';
import { CreateNegativeInventoryPolicyDto } from './create-negative-inventory-policy.dto';

export class UpdateNegativeInventoryPolicyDto extends PartialType(CreateNegativeInventoryPolicyDto) {}
