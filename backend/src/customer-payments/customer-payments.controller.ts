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
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { CustomerPaymentFilterDto } from './dto/customer-payment-filter.dto';
import {
  CustomerPaymentResponseDto,
  PaginatedCustomerPaymentsResponseDto,
} from './dto/customer-payment-response.dto';
import { ReverseCustomerPaymentDto } from './dto/reverse-customer-payment.dto';
import { UpdateCustomerPaymentDto } from './dto/update-customer-payment.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { CustomerPaymentsService } from './customer-payments.service';

@ApiTags('Customer Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customer-payments')
export class CustomerPaymentsController {
  constructor(
    private readonly customerPaymentsService: CustomerPaymentsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer payment' })
  @ApiCreatedResponse({ type: CustomerPaymentResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerPaymentDto,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List customer payments' })
  @ApiOkResponse({ type: PaginatedCustomerPaymentsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: CustomerPaymentFilterDto,
  ): Promise<PaginatedCustomerPaymentsResponseDto> {
    return this.customerPaymentsService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer payment details' })
  @ApiOkResponse({ type: CustomerPaymentResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft customer payment' })
  @ApiOkResponse({ type: CustomerPaymentResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerPaymentDto,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a customer payment' })
  @ApiOkResponse({ type: CustomerPaymentResponseDto })
  postPayment(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted customer payment' })
  @ApiOkResponse({ type: CustomerPaymentResponseDto })
  reverse(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseCustomerPaymentDto,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.reverse(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft customer payment' })
  @ApiOkResponse({ type: CustomerPaymentResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerPaymentResponseDto> {
    return this.customerPaymentsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft customer payment' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.customerPaymentsService.remove(
      id,
      request.user.companyId,
    );
  }
}
