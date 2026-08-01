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
import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { PurchaseInvoiceFilterDto } from './dto/purchase-invoice-filter.dto';
import {
  PaginatedPurchaseInvoicesResponseDto,
  PurchaseInvoiceResponseDto,
} from './dto/purchase-invoice-response.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { PurchaseInvoicesService } from './purchase-invoices.service';

@ApiTags('Purchase Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a purchase invoice' })
  @ApiCreatedResponse({ type: PurchaseInvoiceResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePurchaseInvoiceDto,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.purchaseInvoicesService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List purchase invoices' })
  @ApiOkResponse({ type: PaginatedPurchaseInvoicesResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: PurchaseInvoiceFilterDto,
  ): Promise<PaginatedPurchaseInvoicesResponseDto> {
    return this.purchaseInvoicesService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase invoice details' })
  @ApiOkResponse({ type: PurchaseInvoiceResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.purchaseInvoicesService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft purchase invoice' })
  @ApiOkResponse({ type: PurchaseInvoiceResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseInvoiceDto,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.purchaseInvoicesService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a purchase invoice' })
  @ApiOkResponse({ type: PurchaseInvoiceResponseDto })
  postInvoice(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.purchaseInvoicesService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a purchase invoice' })
  @ApiOkResponse({ type: PurchaseInvoiceResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseInvoiceResponseDto> {
    return this.purchaseInvoicesService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase invoice' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.purchaseInvoicesService.remove(
      id,
      request.user.companyId,
    );
  }
}
