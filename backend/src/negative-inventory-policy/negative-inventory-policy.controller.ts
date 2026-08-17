import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNegativeInventoryPolicyDto } from './dto/create-negative-inventory-policy.dto';
import { EvaluateNegativeInventoryDto } from './dto/evaluate-negative-inventory.dto';
import { NegativeInventoryPolicyFilterDto } from './dto/negative-inventory-policy-filter.dto';
import { UpdateNegativeInventoryPolicyDto } from './dto/update-negative-inventory-policy.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { NegativeInventoryPolicyService } from './negative-inventory-policy.service';

@ApiTags('Negative Inventory Policy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('negative-inventory-policies')
export class NegativeInventoryPolicyController {
  constructor(private readonly service: NegativeInventoryPolicyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a negative inventory policy' })
  create(@Req() request: AuthenticatedRequest, @Body() dto: CreateNegativeInventoryPolicyDto) {
    return this.service.create(request.user.companyId, dto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest, @Query() filter: NegativeInventoryPolicyFilterDto) {
    return this.service.findAll(request.user.companyId, filter);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate a proposed stock issue against the resolved policy' })
  evaluate(@Req() request: AuthenticatedRequest, @Body() dto: EvaluateNegativeInventoryDto) {
    return this.service.evaluate({ companyId: request.user.companyId, ...dto });
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(request.user.companyId, id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNegativeInventoryPolicyDto) {
    return this.service.update(request.user.companyId, id, dto);
  }

  @Delete(':id')
  async remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(request.user.companyId, id);
  }
}
