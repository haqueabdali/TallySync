import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { PreviewSalesVoucherDto } from './dto/preview-sales-voucher.dto';
import { TallyCacheService } from './tally-cache.service';
import { TallyMasterService } from './tally-master.service';
import { TallyRetryService } from './tally-retry.service';
import { TallySyncService } from './tally-sync.service';

type AuthenticatedTallyRequest = Request & { user: AuthenticatedUser };

@ApiTags('Tally Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.API_ACCESS)
@Controller('tally')
export class TallySyncController {
  constructor(
    private readonly tallySyncService: TallySyncService,
    private readonly tallyCacheService: TallyCacheService,
    private readonly tallyMasterService: TallyMasterService,
    private readonly tallyRetryService: TallyRetryService,
  ) {}

  @Get('status')
  checkConnection(@Req() request: AuthenticatedTallyRequest) {
    this.companyId(request);
    return this.tallySyncService.checkTallyConnection();
  }

  @Get('retry-policy')
  getRetryPolicy(@Req() request: AuthenticatedTallyRequest) {
    this.companyId(request);
    return {
      maxAttempts: this.tallyRetryService.getMaxAttempts(),
    };
  }

  @Get('cache')
  getCacheStats(@Req() request: AuthenticatedTallyRequest) {
    this.companyId(request);
    return this.tallyCacheService.getStats();
  }

  @Post('cache/clear')
  clearCache(@Req() request: AuthenticatedTallyRequest) {
    this.companyId(request);
    this.tallyMasterService.clearCache();

    return {
      success: true,
      message: 'Tally master cache cleared',
    };
  }

  @Get('pending')
  getPendingSalesOrders(@Req() request: AuthenticatedTallyRequest) {
    return this.tallySyncService.findPendingSalesOrders(
      this.companyId(request),
    );
  }

  @Post('voucher/preview')
  previewSalesVoucher(
    @Body() dto: PreviewSalesVoucherDto,
    @Req() request: AuthenticatedTallyRequest,
  ) {
    this.companyId(request);
    return this.tallySyncService.previewSalesVoucher(dto);
  }

  @Post('sales-order/:id')
  syncSalesOrder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedTallyRequest,
  ) {
    return this.tallySyncService.syncSalesOrder(id, this.companyId(request));
  }

  @Post('sync')
  syncPendingSalesOrders(@Req() request: AuthenticatedTallyRequest) {
    return this.tallySyncService.syncPendingSalesOrders(
      this.companyId(request),
    );
  }

  private companyId(request: AuthenticatedTallyRequest): string {
    if (!request.user.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }
    return request.user.companyId;
  }
}
