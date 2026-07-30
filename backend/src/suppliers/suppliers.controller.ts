import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierFilterDto } from './dto/supplier-filter.dto';
import { PaginatedSuppliersResponseDto, SupplierResponseDto } from './dto/supplier-response.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SuppliersService } from './suppliers.service';

@ApiTags('Suppliers') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('suppliers')
export class SuppliersController {
  constructor(private readonly service: SuppliersService) {}
  @Post() @ApiOperation({summary:'Create a supplier'}) @ApiCreatedResponse({type:SupplierResponseDto}) create(@Req() req:AuthenticatedRequest,@Body() dto:CreateSupplierDto){return this.service.create(req.user.companyId,req.user.id,dto);}
  @Get() @ApiOperation({summary:'List suppliers'}) @ApiOkResponse({type:PaginatedSuppliersResponseDto}) findAll(@Req() req:AuthenticatedRequest,@Query() filter:SupplierFilterDto){return this.service.findAll(req.user.companyId,filter);}
  @Get('code/:code') findByCode(@Req() req:AuthenticatedRequest,@Param('code') code:string){return this.service.findByCode(req.user.companyId,code);}
  @Get(':id') findOne(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.findOne(req.user.companyId,id);}
  @Patch(':id') update(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() dto:UpdateSupplierDto){return this.service.update(req.user.companyId,req.user.id,id,dto);}
  @Patch(':id/status') updateStatus(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string,@Body() dto:UpdateSupplierStatusDto){return this.service.updateStatus(req.user.companyId,req.user.id,id,dto.isActive);}
  @Patch(':id/restore') restore(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.restore(req.user.companyId,req.user.id,id);}
  @Delete(':id') remove(@Req() req:AuthenticatedRequest,@Param('id',ParseUUIDPipe) id:string){return this.service.remove(req.user.companyId,id);}
}
