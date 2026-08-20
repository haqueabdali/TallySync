import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { AssetDisposalService } from './asset-disposal.service';
import { AssetDisposalFilterDto } from './dto/asset-disposal-filter.dto';
import { CreateAssetDisposalDto } from './dto/create-asset-disposal.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
@RequireLicenseFeature(LicensedFeature.ASSET_MANAGEMENT)
@ApiTags('Asset Disposal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@Controller('asset-disposals')
export class AssetDisposalController {
  constructor(private readonly service: AssetDisposalService) {}
  @Post() @ApiCreatedResponse() create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAssetDisposalDto,
  ) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }
  @Get() @ApiOkResponse() list(
    @Req() req: AuthenticatedRequest,
    @Query() filter: AssetDisposalFilterDto,
  ) {
    return this.service.list(req.user.companyId, filter);
  }
  @Get(':id') @ApiOkResponse() get(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(req.user.companyId, id);
  }
  @Post(':id/post') @ApiOkResponse() post(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.post(req.user.companyId, req.user.id, id);
  }
}
