import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { AccountLedgerFilterDto } from './dto/account-ledger-filter.dto';
import { GeneralLedgerFilterDto } from './dto/general-ledger-filter.dto';
import {
  GeneralLedgerAccountResponseDto,
  GeneralLedgerSummaryResponseDto,
} from './dto/general-ledger-response.dto';
import { TrialBalanceFilterDto } from './dto/trial-balance-filter.dto';
import { TrialBalanceResponseDto } from './dto/trial-balance-response.dto';
import { GeneralLedgerService } from './general-ledger.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('General Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.ACCOUNTING)
@Controller('general-ledger')
export class GeneralLedgerController {
  constructor(private readonly generalLedgerService: GeneralLedgerService) {}

  @Get()
  @ApiOperation({ summary: 'Get general ledger summary' })
  @ApiOkResponse({ type: GeneralLedgerSummaryResponseDto })
  getGeneralLedger(
    @Req() request: AuthenticatedRequest,
    @Query() filter: GeneralLedgerFilterDto,
  ): Promise<GeneralLedgerSummaryResponseDto> {
    return this.generalLedgerService.getGeneralLedger(
      filter,
      request.user.companyId,
    );
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance' })
  @ApiOkResponse({ type: TrialBalanceResponseDto })
  getTrialBalance(
    @Req() request: AuthenticatedRequest,
    @Query() filter: TrialBalanceFilterDto,
  ): Promise<TrialBalanceResponseDto> {
    return this.generalLedgerService.getTrialBalance(
      filter,
      request.user.companyId,
    );
  }

  @Get('accounts/:accountId')
  @ApiOperation({ summary: 'Get ledger for one account' })
  @ApiOkResponse({ type: GeneralLedgerAccountResponseDto })
  getAccountLedger(
    @Req() request: AuthenticatedRequest,
    @Param('accountId', ParseUUIDPipe) accountId: string,
    @Query() filter: AccountLedgerFilterDto,
  ): Promise<GeneralLedgerAccountResponseDto> {
    return this.generalLedgerService.getAccountLedger(
      accountId,
      filter,
      request.user.companyId,
    );
  }
}
