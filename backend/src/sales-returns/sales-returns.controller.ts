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
import { CreateSalesReturnDto } from './dto/create-sales-return.dto';
import { ReverseSalesReturnDto } from './dto/reverse-sales-return.dto';
import { SalesReturnFilterDto } from './dto/sales-return-filter.dto';
import {
  PaginatedSalesReturnsResponseDto,
  SalesReturnResponseDto,
} from './dto/sales-return-response.dto';
import { UpdateSalesReturnDto } from './dto/update-sales-return.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SalesReturnsService } from './sales-returns.service';

@ApiTags('Sales Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales-returns')
export class SalesReturnsController {
  constructor(
    private readonly salesReturnsService: SalesReturnsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a sales return' })
  @ApiCreatedResponse({ type: SalesReturnResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateSalesReturnDto,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List sales returns' })
  @ApiOkResponse({ type: PaginatedSalesReturnsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: SalesReturnFilterDto,
  ): Promise<PaginatedSalesReturnsResponseDto> {
    return this.salesReturnsService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sales return details' })
  @ApiOkResponse({ type: SalesReturnResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft sales return' })
  @ApiOkResponse({ type: SalesReturnResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSalesReturnDto,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a sales return' })
  @ApiOkResponse({ type: SalesReturnResponseDto })
  postReturn(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted sales return' })
  @ApiOkResponse({ type: SalesReturnResponseDto })
  reverse(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseSalesReturnDto,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.reverse(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft sales return' })
  @ApiOkResponse({ type: SalesReturnResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SalesReturnResponseDto> {
    return this.salesReturnsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft sales return' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.salesReturnsService.remove(
      id,
      request.user.companyId,
    );
  }
}
