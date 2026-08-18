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
import { BalanceSheetService } from './balance-sheet.service';
import { BalanceSheetFilterDto } from './dto/balance-sheet-filter.dto';
import { BalanceSheetResponseDto } from './dto/balance-sheet-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Balance Sheet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.REPORTING)
@Controller('balance-sheet')
export class BalanceSheetController {
  constructor(private readonly balanceSheetService: BalanceSheetService) {}

  @Get()
  @ApiOperation({ summary: 'Generate a balance sheet as of a date' })
  @ApiOkResponse({ type: BalanceSheetResponseDto })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() filter: BalanceSheetFilterDto,
  ): Promise<BalanceSheetResponseDto> {
    return this.balanceSheetService.getReport(filter, request.user.companyId);
  }
}
