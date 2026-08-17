import { PartialType } from '@nestjs/swagger';
import { CreateProductionCostAnalysisDto } from './create-production-cost-analysis.dto';

export class UpdateProductionCostAnalysisDto extends PartialType(
  CreateProductionCostAnalysisDto,
) {}
