import { PartialType } from '@nestjs/swagger';
import { CreateMaintenanceAssetDto } from './create-maintenance-asset.dto';

export class UpdateMaintenanceAssetDto extends PartialType(
  CreateMaintenanceAssetDto,
) {}
