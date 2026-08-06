import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssetFilterDto } from './dto/asset-filter.dto';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { CreateFixedAssetDto } from './dto/create-fixed-asset.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';
import { UpdateFixedAssetDto } from './dto/update-fixed-asset.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { AssetManagementService } from './asset-management.service';

@ApiTags('Asset Management') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('asset-management')
export class AssetManagementController {
  constructor(private readonly service: AssetManagementService) {}
  @Post('categories') @ApiOperation({ summary: 'Create an asset category' }) @ApiCreatedResponse() createCategory(@Req() r: AuthenticatedRequest, @Body() d: CreateAssetCategoryDto) { return this.service.createCategory(r.user.companyId, r.user.id, d); }
  @Get('categories') @ApiOkResponse() listCategories(@Req() r: AuthenticatedRequest) { return this.service.listCategories(r.user.companyId); }
  @Patch('categories/:id') updateCategory(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateAssetCategoryDto) { return this.service.updateCategory(r.user.companyId, r.user.id, id, d); }
  @Delete('categories/:id') removeCategory(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.removeCategory(r.user.companyId, id); }
  @Post('assets') @ApiOperation({ summary: 'Create a fixed asset' }) @ApiCreatedResponse() createAsset(@Req() r: AuthenticatedRequest, @Body() d: CreateFixedAssetDto) { return this.service.createAsset(r.user.companyId, r.user.id, d); }
  @Get('assets') @ApiOkResponse() listAssets(@Req() r: AuthenticatedRequest, @Query() f: AssetFilterDto) { return this.service.listAssets(r.user.companyId, f); }
  @Get('assets/:id') @ApiOkResponse() getAsset(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.getAsset(r.user.companyId, id); }
  @Patch('assets/:id') updateAsset(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateFixedAssetDto) { return this.service.updateAsset(r.user.companyId, r.user.id, id, d); }
  @Patch('assets/:id/activate') activate(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.activateAsset(r.user.companyId, r.user.id, id); }
  @Patch('assets/:id/deactivate') deactivate(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.deactivateAsset(r.user.companyId, r.user.id, id); }
  @Delete('assets/:id') removeAsset(@Req() r: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.removeAsset(r.user.companyId, id); }
}
