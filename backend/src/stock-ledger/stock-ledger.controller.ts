import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockLedgerPageResponseDto } from './dto/stock-ledger-page-response.dto';
import { StockLedgerQueryDto } from './dto/stock-ledger-query.dto';
import { StockLedgerSummaryResponseDto } from './dto/stock-ledger-summary-response.dto';
import type { StockLedgerAuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { StockLedgerService } from './stock-ledger.service';

@ApiTags('Stock Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock-ledger')
export class StockLedgerController {
  constructor(private readonly stockLedgerService: StockLedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated warehouse stock ledger entries' })
  @ApiOkResponse({ type: StockLedgerPageResponseDto })
  findAll(
    @Req() request: StockLedgerAuthenticatedRequest,
    @Query() query: StockLedgerQueryDto,
  ): Promise<StockLedgerPageResponseDto> {
    return this.stockLedgerService.findAll(request.user.companyId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get stock ledger opening, movement, and closing summary' })
  @ApiOkResponse({ type: StockLedgerSummaryResponseDto })
  getSummary(
    @Req() request: StockLedgerAuthenticatedRequest,
    @Query() query: StockLedgerQueryDto,
  ): Promise<StockLedgerSummaryResponseDto> {
    return this.stockLedgerService.getSummary(request.user.companyId, query);
  }
}
