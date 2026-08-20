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
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditCtx } from '../users/decorators/audit-context.decorator';
import type { AuditContext } from '../users/interfaces/audit-context.interface';

import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import {
  CustomerResponseDto,
  PaginatedCustomersResponseDto,
} from './dto/customer-response.dto';
import { CustomerRequestContext } from './interfaces/customer-request-context.interface';

@ApiTags('Customers')
@ApiBearerAuth()
@RequireLicenseFeature(LicensedFeature.SALES)
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  create(
    @Body() dto: CreateCustomerDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.customersService.create(dto, this.toContext(audit));
  }

  @Get()
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  @ApiOperation({ summary: 'List customers' })
  @ApiOkResponse({ type: PaginatedCustomersResponseDto })
  findAll(
    @Query() query: ListCustomersQueryDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<PaginatedCustomersResponseDto> {
    return this.customersService.findAll(query, this.toContext(audit));
  }

  @Get(':id')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  @ApiOperation({ summary: 'Get a customer by ID' })
  @ApiOkResponse({ type: CustomerResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.customersService.findOne(id, this.toContext(audit));
  }

  @Patch(':id')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiOkResponse({ type: CustomerResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.customersService.update(id, dto, this.toContext(audit));
  }

  @Patch(':id/status')
  @Roles('admin', 'company_owner')
  @ApiOperation({ summary: 'Activate or deactivate a customer' })
  @ApiOkResponse({ type: CustomerResponseDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.customersService.updateStatus(id, dto, this.toContext(audit));
  }

  @Patch(':id/restore')
  @Roles('admin', 'company_owner')
  @ApiOperation({ summary: 'Restore a soft-deleted customer' })
  @ApiOkResponse({ type: CustomerResponseDto })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<CustomerResponseDto> {
    return this.customersService.restore(id, this.toContext(audit));
  }

  @Delete(':id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a customer' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<void> {
    await this.customersService.remove(id, this.toContext(audit));
  }

  private toContext(audit: AuditContext): CustomerRequestContext {
    return {
      actorId: audit.actorId ?? null,
      companyId: audit.companyId ?? null,
      ipAddress: audit.ipAddress ?? null,
      userAgent: audit.userAgent ?? null,
    };
  }
}
