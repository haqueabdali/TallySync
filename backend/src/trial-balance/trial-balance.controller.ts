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
import { TrialBalanceQueryDto } from './dto/trial-balance-query.dto';
import { TrialBalanceResponseDto } from './dto/trial-balance-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { TrialBalanceService } from './trial-balance.service';

@ApiTags('Financial Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.REPORTING)
@Controller('trial-balance')
export class TrialBalanceController {
  constructor(private readonly trialBalanceService: TrialBalanceService) {}

  @Get()
  @ApiOperation({ summary: 'Generate a trial balance from posted journals' })
  @ApiOkResponse({ type: TrialBalanceResponseDto })
  getTrialBalance(
    @Req() request: AuthenticatedRequest,
    @Query() query: TrialBalanceQueryDto,
  ): Promise<TrialBalanceResponseDto> {
    return this.trialBalanceService.getTrialBalance(
      request.user.companyId,
      query,
    );
  }
}
