import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfitAndLossFilterDto } from './dto/profit-and-loss-filter.dto';
import { ProfitAndLossResponseDto } from './dto/profit-and-loss-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { ProfitAndLossService } from './profit-and-loss.service';

@ApiTags('Profit & Loss')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profit-and-loss')
export class ProfitAndLossController {
  constructor(
    private readonly profitAndLossService: ProfitAndLossService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Generate a profit and loss statement' })
  @ApiOkResponse({ type: ProfitAndLossResponseDto })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() filter: ProfitAndLossFilterDto,
  ): Promise<ProfitAndLossResponseDto> {
    return this.profitAndLossService.getReport(
      filter,
      request.user.companyId,
    );
  }
}
