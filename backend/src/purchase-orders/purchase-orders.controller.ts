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
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderFilterDto } from './dto/purchase-order-filter.dto';
import {
  PaginatedPurchaseOrdersResponseDto,
  PurchaseOrderResponseDto,
} from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { PurchaseOrdersService } from './purchase-orders.service';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.PURCHASE)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}
  @Post()
  @ApiOperation({ summary: 'Create a purchase order' })
  @ApiCreatedResponse({ type: PurchaseOrderResponseDto })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }
  @Get()
  @ApiOperation({ summary: 'List purchase orders' })
  @ApiOkResponse({ type: PaginatedPurchaseOrdersResponseDto })
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() filter: PurchaseOrderFilterDto,
  ): Promise<PaginatedPurchaseOrdersResponseDto> {
    return this.service.findAll(req.user.companyId, filter);
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details' })
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(req.user.companyId, id);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft purchase order' })
  @ApiOkResponse({ type: PurchaseOrderResponseDto })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.service.update(req.user.companyId, req.user.id, id, dto);
  }
  @Patch(':id/send')
  @ApiOperation({ summary: 'Mark purchase order as sent' })
  send(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.send(req.user.companyId, req.user.id, id);
  }
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel purchase order' })
  cancel(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(req.user.companyId, req.user.id, id);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase order' })
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.user.companyId, id);
  }
}
