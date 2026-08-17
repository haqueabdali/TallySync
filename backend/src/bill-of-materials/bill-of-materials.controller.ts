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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { BillOfMaterialsService } from './bill-of-materials.service';
import { BillOfMaterialFilterDto } from './dto/bill-of-material-filter.dto';
import {
  BillOfMaterialResponseDto,
  PaginatedBillsOfMaterialResponseDto,
} from './dto/bill-of-material-response.dto';
import { CreateBillOfMaterialDto } from './dto/create-bill-of-material.dto';
import { UpdateBillOfMaterialDto } from './dto/update-bill-of-material.dto';
import type { AuthenticatedBillOfMaterialRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Bill of Materials')
@ApiBearerAuth()
@Controller('bill-of-materials')
@UseGuards(JwtAuthGuard)
export class BillOfMaterialsController {
  constructor(private readonly service: BillOfMaterialsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft bill of materials' })
  @ApiCreatedResponse({ type: BillOfMaterialResponseDto })
  create(@Body() dto: CreateBillOfMaterialDto, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<BillOfMaterialResponseDto> {
    return this.service.create(dto, request.user.companyId, request.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List bills of material' })
  @ApiOkResponse({ type: PaginatedBillsOfMaterialResponseDto })
  findAll(@Query() filter: BillOfMaterialFilterDto, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<PaginatedBillsOfMaterialResponseDto> {
    return this.service.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bill of materials' })
  @ApiOkResponse({ type: BillOfMaterialResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<BillOfMaterialResponseDto> {
    return this.service.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft bill of materials' })
  @ApiOkResponse({ type: BillOfMaterialResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBillOfMaterialDto, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<BillOfMaterialResponseDto> {
    return this.service.update(id, dto, request.user.companyId, request.user.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a bill of materials' })
  @ApiOkResponse({ type: BillOfMaterialResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<BillOfMaterialResponseDto> {
    return this.service.activate(id, request.user.companyId, request.user.id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a bill of materials' })
  @ApiOkResponse({ type: BillOfMaterialResponseDto })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<BillOfMaterialResponseDto> {
    return this.service.deactivate(id, request.user.companyId, request.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a non-active bill of materials' })
  @ApiOkResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() request: AuthenticatedBillOfMaterialRequest): Promise<{ message: string }> {
    return this.service.remove(id, request.user.companyId);
  }
}
