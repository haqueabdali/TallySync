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
import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import {
  PaginatedPurchaseReturnsResponseDto,
  PurchaseReturnResponseDto,
} from './dto/purchase-return-response.dto';
import { PurchaseReturnFilterDto } from './dto/purchase-return-filter.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { PurchaseReturnsService } from './purchase-returns.service';

@ApiTags('Purchase Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.PURCHASE)
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(
    private readonly purchaseReturnsService: PurchaseReturnsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a purchase return' })
  @ApiCreatedResponse({ type: PurchaseReturnResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePurchaseReturnDto,
  ): Promise<PurchaseReturnResponseDto> {
    return this.purchaseReturnsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List purchase returns' })
  @ApiOkResponse({ type: PaginatedPurchaseReturnsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: PurchaseReturnFilterDto,
  ): Promise<PaginatedPurchaseReturnsResponseDto> {
    return this.purchaseReturnsService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase return details' })
  @ApiOkResponse({ type: PurchaseReturnResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.purchaseReturnsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft purchase return' })
  @ApiOkResponse({ type: PurchaseReturnResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseReturnDto,
  ): Promise<PurchaseReturnResponseDto> {
    return this.purchaseReturnsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a purchase return' })
  @ApiOkResponse({ type: PurchaseReturnResponseDto })
  postReturn(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.purchaseReturnsService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase return' })
  @ApiOkResponse({ type: PurchaseReturnResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseReturnResponseDto> {
    return this.purchaseReturnsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase return' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.purchaseReturnsService.remove(id, request.user.companyId);
  }
}
