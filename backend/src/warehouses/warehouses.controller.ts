import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseStatusDto } from './dto/update-warehouse-status.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseFilterDto } from './dto/warehouse-filter.dto';
import {
  PaginatedWarehousesResponseDto,
  WarehouseResponseDto,
} from './dto/warehouse-response.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { WarehousesService } from './warehouses.service';
@RequireLicenseFeature(LicensedFeature.INVENTORY)
@ApiTags('Warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private readonly service: WarehousesService) {}
  @Post()
  @ApiOperation({ summary: 'Create a warehouse' })
  @ApiCreatedResponse({ type: WarehouseResponseDto })
  create(@Req() r: AuthenticatedRequest, @Body() d: CreateWarehouseDto) {
    return this.service.create(r.user.companyId, r.user.id, d);
  }
  @Get()
  @ApiOperation({ summary: 'List warehouses' })
  @ApiOkResponse({ type: PaginatedWarehousesResponseDto })
  findAll(@Req() r: AuthenticatedRequest, @Query() f: WarehouseFilterDto) {
    return this.service.findAll(r.user.companyId, f);
  }
  @Get('code/:code') @ApiOkResponse({ type: WarehouseResponseDto }) findByCode(
    @Req() r: AuthenticatedRequest,
    @Param('code') c: string,
  ) {
    return this.service.findByCode(r.user.companyId, c);
  }
  @Get(':id') @ApiOkResponse({ type: WarehouseResponseDto }) findOne(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(r.user.companyId, id);
  }
  @Patch(':id') @ApiOkResponse({ type: WarehouseResponseDto }) update(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateWarehouseDto,
  ) {
    return this.service.update(r.user.companyId, r.user.id, id, d);
  }
  @Patch(':id/status') @ApiOkResponse({ type: WarehouseResponseDto }) status(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: UpdateWarehouseStatusDto,
  ) {
    return this.service.updateStatus(
      r.user.companyId,
      r.user.id,
      id,
      d.isActive,
    );
  }
  @Patch(':id/default')
  @ApiOkResponse({ type: WarehouseResponseDto })
  setDefault(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.setDefault(r.user.companyId, r.user.id, id);
  }
  @Patch(':id/restore') @ApiOkResponse({ type: WarehouseResponseDto }) restore(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.restore(r.user.companyId, r.user.id, id);
  }
  @Delete(':id') remove(
    @Req() r: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(r.user.companyId, id);
  }
}
