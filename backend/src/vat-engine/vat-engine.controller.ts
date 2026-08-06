import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateVatReturnDto } from './dto/create-vat-return.dto';
import { VatReturnFilterDto } from './dto/vat-return-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { VatEngineService } from './vat-engine.service';

@ApiTags('VAT Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vat-returns')
export class VatEngineController {
  constructor(private readonly service: VatEngineService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a draft VAT return' })
  @ApiCreatedResponse()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateVatReturnDto) {
    return this.service.create(dto, req.user.companyId, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List VAT returns' })
  @ApiOkResponse()
  findAll(@Req() req: AuthenticatedRequest, @Query() query: VatReturnFilterDto) {
    return this.service.findAll(req.user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a VAT return' })
  @ApiOkResponse()
  findOne(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.findOne(id, req.user.companyId);
  }

  @Post(':id/finalize')
  @ApiOperation({ summary: 'Finalize a draft VAT return' })
  @ApiOkResponse()
  finalize(@Req() req: AuthenticatedRequest, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.service.finalize(id, req.user.companyId, req.user.id);
  }
}
