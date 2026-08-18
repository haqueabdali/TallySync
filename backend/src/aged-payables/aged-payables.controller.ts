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
import { AgedPayablesService } from './aged-payables.service';
import { AgedPayablesFilterDto } from './dto/aged-payables-filter.dto';
import { AgedPayablesResponseDto } from './dto/aged-payables-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Aged Payables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.REPORTING)
@Controller('aged-payables')
export class AgedPayablesController {
  constructor(private readonly agedPayablesService: AgedPayablesService) {}

  @Get()
  @ApiOperation({ summary: 'Generate supplier payables aging' })
  @ApiOkResponse({ type: AgedPayablesResponseDto })
  getReport(
    @Req() request: AuthenticatedRequest,
    @Query() filter: AgedPayablesFilterDto,
  ): Promise<AgedPayablesResponseDto> {
    return this.agedPayablesService.getReport(filter, request.user.companyId);
  }
}
