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
import { CreateSalesQuotationDto } from './dto/create-sales-quotation.dto';
import { SalesQuotationFilterDto } from './dto/sales-quotation-filter.dto';
import {
  PaginatedSalesQuotationsResponseDto,
  SalesQuotationResponseDto,
} from './dto/sales-quotation-response.dto';
import { UpdateSalesQuotationDto } from './dto/update-sales-quotation.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SalesQuotationsService } from './sales-quotations.service';

@ApiTags('Sales Quotations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.SALES)
@Controller('sales-quotations')
export class SalesQuotationsController {
  constructor(
    private readonly salesQuotationsService: SalesQuotationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a sales quotation' })
  @ApiCreatedResponse({ type: SalesQuotationResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSalesQuotationDto,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List sales quotations' })
  @ApiOkResponse({ type: PaginatedSalesQuotationsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SalesQuotationFilterDto,
  ): Promise<PaginatedSalesQuotationsResponseDto> {
    return this.salesQuotationsService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales quotation details' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft sales quotation' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesQuotationDto,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send a sales quotation' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  send(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.send(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a sent sales quotation' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  accept(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.accept(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a sent sales quotation' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  reject(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.reject(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a sales quotation' })
  @ApiOkResponse({ type: SalesQuotationResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesQuotationResponseDto> {
    return this.salesQuotationsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post('actions/expire-overdue')
  @ApiOperation({ summary: 'Mark overdue sent quotations as expired' })
  expireOverdue(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ affected: number }> {
    return this.salesQuotationsService.expireOverdue(request.user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft sales quotation' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.salesQuotationsService.remove(id, request.user.companyId);
  }
}
