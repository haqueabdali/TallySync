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
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import {
  PaginatedSupplierPaymentsResponseDto,
  SupplierPaymentResponseDto,
} from './dto/supplier-payment-response.dto';
import { SupplierPaymentFilterDto } from './dto/supplier-payment-filter.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SupplierPaymentsService } from './supplier-payments.service';

@ApiTags('Supplier Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.PURCHASE)
@Controller('supplier-payments')
export class SupplierPaymentsController {
  constructor(
    private readonly supplierPaymentsService: SupplierPaymentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a supplier payment' })
  @ApiCreatedResponse({ type: SupplierPaymentResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    return this.supplierPaymentsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List supplier payments' })
  @ApiOkResponse({ type: PaginatedSupplierPaymentsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SupplierPaymentFilterDto,
  ): Promise<PaginatedSupplierPaymentsResponseDto> {
    return this.supplierPaymentsService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get supplier payment details' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierPaymentResponseDto> {
    return this.supplierPaymentsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft supplier payment' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    return this.supplierPaymentsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a supplier payment' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  postPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierPaymentResponseDto> {
    return this.supplierPaymentsService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a supplier payment' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplierPaymentResponseDto> {
    return this.supplierPaymentsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft supplier payment' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.supplierPaymentsService.remove(id, request.user.companyId);
  }
}
