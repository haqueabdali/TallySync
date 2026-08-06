import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SupplierStatementFilterDto } from './dto/supplier-statement-filter.dto';
import { SupplierStatementResponseDto } from './dto/supplier-statement-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SupplierStatementsService } from './supplier-statements.service';

@ApiTags('Supplier Statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('supplier-statements')
export class SupplierStatementsController {
  constructor(
    private readonly supplierStatementsService: SupplierStatementsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Generate a supplier account statement' })
  @ApiOkResponse({ type: SupplierStatementResponseDto })
  getStatement(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SupplierStatementFilterDto,
  ): Promise<SupplierStatementResponseDto> {
    return this.supplierStatementsService.getStatement(
      filter,
      request.user.companyId,
    );
  }
}
