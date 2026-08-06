import { ApiProperty } from '@nestjs/swagger';
import { MrpPlanLineResponseDto } from './mrp-plan-line-response.dto';
import { MrpPlanSummaryResponseDto } from './mrp-plan-summary-response.dto';

export class MrpPlanPageResponseDto {
  @ApiProperty({ type: MrpPlanLineResponseDto, isArray: true })
  data!: MrpPlanLineResponseDto[];

  @ApiProperty({ type: MrpPlanSummaryResponseDto })
  summary!: MrpPlanSummaryResponseDto;

  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
