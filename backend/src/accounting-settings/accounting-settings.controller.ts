import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { AccountingSettingsResponseDto } from './dto/accounting-settings-response.dto';
import { AccountingSettingsValidationResponseDto } from './dto/accounting-settings-validation-response.dto';
import { SeedAccountingSettingsDto } from './dto/seed-accounting-settings.dto';
import { UpdateAccountingSettingsDto } from './dto/update-accounting-settings.dto';
import { AccountingSettingsService } from './accounting-settings.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Accounting Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.ACCOUNTING)
@Controller('accounting-settings')
export class AccountingSettingsController {
  constructor(
    private readonly accountingSettingsService: AccountingSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get company accounting settings' })
  @ApiOkResponse({ type: AccountingSettingsResponseDto })
  get(
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountingSettingsResponseDto> {
    return this.accountingSettingsService.get(request.user.companyId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update accounting settings' })
  @ApiOkResponse({ type: AccountingSettingsResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateAccountingSettingsDto,
  ): Promise<AccountingSettingsResponseDto> {
    return this.accountingSettingsService.update(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post('seed-defaults')
  @ApiOperation({
    summary: 'Create default accounting settings from chart of accounts',
  })
  @ApiCreatedResponse({ type: AccountingSettingsResponseDto })
  seedDefaults(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SeedAccountingSettingsDto,
  ): Promise<AccountingSettingsResponseDto> {
    return this.accountingSettingsService.seedDefaults(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get('validate')
  @ApiOperation({
    summary: 'Validate accounting settings and account mappings',
  })
  @ApiOkResponse({
    type: AccountingSettingsValidationResponseDto,
  })
  validate(
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountingSettingsValidationResponseDto> {
    return this.accountingSettingsService.validate(request.user.companyId);
  }
}
