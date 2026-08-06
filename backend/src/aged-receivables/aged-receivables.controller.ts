import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgedReceivablesService } from './aged-receivables.service';
import { AgedReceivablesFilterDto } from './dto/aged-receivables-filter.dto';
import { AgedReceivablesResponseDto } from './dto/aged-receivables-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Aged Receivables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('aged-receivables')
export class AgedReceivablesController {
  constructor(
    private readonly agedReceivablesService: AgedReceivablesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Generate customer receivables aging' })
  @ApiOkResponse({ type: AgedReceivablesResponseDto })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() filter: AgedReceivablesFilterDto,
  ): Promise<AgedReceivablesResponseDto> {
    return this.agedReceivablesService.getReport(
      filter,
      request.user.companyId,
    );
  }
}
