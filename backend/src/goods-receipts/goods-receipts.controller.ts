import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { GoodsReceiptFilterDto } from './dto/goods-receipt-filter.dto';
import {
  GoodsReceiptResponseDto,
  PaginatedGoodsReceiptsResponseDto,
} from './dto/goods-receipt-response.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';
import { GoodsReceiptsService } from './goods-receipts.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Goods Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.PURCHASE)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(private readonly goodsReceiptsService: GoodsReceiptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft goods receipt' })
  @ApiCreatedResponse({ type: GoodsReceiptResponseDto })
  create(
    @Body() dto: CreateGoodsReceiptDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<GoodsReceiptResponseDto> {
    return this.goodsReceiptsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List goods receipts' })
  @ApiOkResponse({ type: PaginatedGoodsReceiptsResponseDto })
  findAll(
    @Query() filter: GoodsReceiptFilterDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedGoodsReceiptsResponseDto> {
    return this.goodsReceiptsService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a goods receipt by ID' })
  @ApiOkResponse({ type: GoodsReceiptResponseDto })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GoodsReceiptResponseDto> {
    return this.goodsReceiptsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft goods receipt' })
  @ApiOkResponse({ type: GoodsReceiptResponseDto })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGoodsReceiptDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<GoodsReceiptResponseDto> {
    return this.goodsReceiptsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a draft goods receipt' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.goodsReceiptsService.remove(id, request.user.companyId);
  }

  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Post a draft goods receipt' })
  @ApiOkResponse({ type: GoodsReceiptResponseDto })
  postReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GoodsReceiptResponseDto> {
    return this.goodsReceiptsService.post(id, request.user.companyId);
  }

  @Post(':id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a posted goods receipt' })
  @ApiOkResponse({ type: GoodsReceiptResponseDto })
  reverseReceipt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<GoodsReceiptResponseDto> {
    return this.goodsReceiptsService.reverse(id, request.user.companyId);
  }
}
