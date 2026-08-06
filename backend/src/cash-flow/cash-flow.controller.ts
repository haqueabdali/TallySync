import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CashFlowService } from './cash-flow.service';
import { CashFlowReportFilterDto } from './dto/cash-flow-report-filter.dto';
import { CashFlowReportResponseDto } from './dto/cash-flow-response.dto';
import { UpsertCashFlowAccountMappingDto } from './dto/upsert-cash-flow-account-mapping.dto';
import { CashFlowAccountMappingEntity } from './entities/cash-flow-account-mapping.entity';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Cash Flow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cash-flow')
export class CashFlowController {
  constructor(private readonly cashFlowService: CashFlowService) {}

  @Post('account-mappings')
  @ApiOperation({ summary: 'Create or update a cash-flow account mapping' })
  @ApiOkResponse({ type: CashFlowAccountMappingEntity })
  upsertMapping(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpsertCashFlowAccountMappingDto,
  ): Promise<CashFlowAccountMappingEntity> {
    return this.cashFlowService.upsertMapping(dto, request.user.companyId);
  }

  @Get('account-mappings')
  @ApiOperation({ summary: 'List cash-flow account mappings' })
  getMappings(
    @Req() request: AuthenticatedRequest,
  ): Promise<CashFlowAccountMappingEntity[]> {
    return this.cashFlowService.listMappings(request.user.companyId);
  }

  @Delete('account-mappings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  removeMapping(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.cashFlowService.removeMapping(id, request.user.companyId);
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate the indirect-classified cash-flow report' })
  @ApiOkResponse({ type: CashFlowReportResponseDto })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() filter: CashFlowReportFilterDto,
  ): Promise<CashFlowReportResponseDto> {
    return this.cashFlowService.getReport(filter, request.user.companyId);
  }
}
