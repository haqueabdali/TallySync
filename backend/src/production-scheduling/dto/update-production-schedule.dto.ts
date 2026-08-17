import { PartialType } from '@nestjs/swagger';
import { CreateProductionScheduleDto } from './create-production-schedule.dto';

export class UpdateProductionScheduleDto extends PartialType(
  CreateProductionScheduleDto,
) {}
