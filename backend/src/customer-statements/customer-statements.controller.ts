import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CustomerStatementsService } from './customer-statements.service';
import { CustomerStatementFilterDto } from './dto/customer-statement-filter.dto';
import { CustomerStatementResponseDto } from './dto/customer-statement-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Customer Statements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.REPORTING)
@Controller('customer-statements')
export class CustomerStatementsController {
  constructor(
    private readonly customerStatementsService: CustomerStatementsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Generate a customer account statement' })
  @ApiOkResponse({ type: CustomerStatementResponseDto })
  getStatement(
    @Req() request: AuthenticatedRequest,
    @Query() filter: CustomerStatementFilterDto,
  ): Promise<CustomerStatementResponseDto> {
    return this.customerStatementsService.getStatement(
      filter,
      request.user.companyId,
    );
  }
}
