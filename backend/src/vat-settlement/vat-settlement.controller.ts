import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateVatSettlementDto } from './dto/create-vat-settlement.dto';
import { UpsertVatSettlementSettingsDto } from './dto/upsert-vat-settlement-settings.dto';
import { VatSettlementFilterDto } from './dto/vat-settlement-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { VatSettlementService } from './vat-settlement.service';

@ApiTags('VAT Settlement')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.VAT)
@Controller('vat-settlements')
export class VatSettlementController {
  constructor(private readonly service: VatSettlementService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get VAT settlement account settings' })
  getSettings(@Req() req: AuthenticatedRequest) {
    return this.service.getSettings(req.user.companyId);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Create or update VAT settlement account settings' })
  upsertSettings(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpsertVatSettlementSettingsDto,
  ) {
    return this.service.upsertSettings(req.user.companyId, req.user.id, dto);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a draft VAT settlement from a finalized VAT return',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateVatSettlementDto,
  ) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List VAT settlements' })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() filter: VatSettlementFilterDto,
  ) {
    return this.service.findAll(req.user.companyId, filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one VAT settlement' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a VAT settlement journal' })
  post(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.post(req.user.companyId, req.user.id, id);
  }
}
