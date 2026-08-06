import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MrpPlanPageResponseDto } from './dto/mrp-plan-page-response.dto';
import { MrpPlanQueryDto } from './dto/mrp-plan-query.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ManufacturingMrpService } from './manufacturing-mrp.service';

@ApiTags('Manufacturing MRP')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('manufacturing/mrp')
export class ManufacturingMrpController {
  constructor(private readonly service: ManufacturingMrpService) {}

  @Get('plan')
  @ApiOperation({
    summary: 'Calculate warehouse-level material replenishment requirements',
  })
  @ApiOkResponse({ type: MrpPlanPageResponseDto })
  getPlan(
    @Req() request: AuthenticatedRequest,
    @Query() query: MrpPlanQueryDto,
  ): Promise<MrpPlanPageResponseDto> {
    return this.service.getPlan(request.user.companyId, query);
  }
}
