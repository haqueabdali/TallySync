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
import { CreateSalesInvoiceDto } from './dto/create-sales-invoice.dto';
import { SalesInvoiceFilterDto } from './dto/sales-invoice-filter.dto';
import {
  PaginatedSalesInvoicesResponseDto,
  SalesInvoiceResponseDto,
} from './dto/sales-invoice-response.dto';
import { UpdateSalesInvoiceDto } from './dto/update-sales-invoice.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SalesInvoicesService } from './sales-invoices.service';

@ApiTags('Sales Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-invoices')
export class SalesInvoicesController {
  constructor(
    private readonly salesInvoicesService: SalesInvoicesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a sales invoice' })
  @ApiCreatedResponse({ type: SalesInvoiceResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSalesInvoiceDto,
  ): Promise<SalesInvoiceResponseDto> {
    return this.salesInvoicesService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List sales invoices' })
  @ApiOkResponse({ type: PaginatedSalesInvoicesResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SalesInvoiceFilterDto,
  ): Promise<PaginatedSalesInvoicesResponseDto> {
    return this.salesInvoicesService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales invoice details' })
  @ApiOkResponse({ type: SalesInvoiceResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.salesInvoicesService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft sales invoice' })
  @ApiOkResponse({ type: SalesInvoiceResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesInvoiceDto,
  ): Promise<SalesInvoiceResponseDto> {
    return this.salesInvoicesService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a sales invoice' })
  @ApiOkResponse({ type: SalesInvoiceResponseDto })
  postInvoice(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.salesInvoicesService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales invoice' })
  @ApiOkResponse({ type: SalesInvoiceResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesInvoiceResponseDto> {
    return this.salesInvoicesService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft sales invoice' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.salesInvoicesService.remove(
      id,
      request.user.companyId,
    );
  }
}
