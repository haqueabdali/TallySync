import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateDepreciationRunDto } from './dto/create-depreciation-run.dto';
import { DepreciationRunFilterDto } from './dto/depreciation-run-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { DepreciationService } from './depreciation.service';
@ApiTags('Depreciation') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('depreciation')
export class DepreciationController {
  constructor(private readonly service: DepreciationService) {}
  @Get('preview') @ApiOperation({ summary: 'Preview depreciation due through a period' }) @ApiOkResponse() preview(@Req() request: AuthenticatedRequest, @Query('periodEnd') periodEnd: string) { return this.service.preview(request.user.companyId, periodEnd); }
  @Post('runs') @ApiCreatedResponse() create(@Req() request: AuthenticatedRequest, @Body() dto: CreateDepreciationRunDto) { return this.service.createRun(request.user.companyId, request.user.id, dto); }
  @Get('runs') @ApiOkResponse() list(@Req() request: AuthenticatedRequest, @Query() filter: DepreciationRunFilterDto) { return this.service.listRuns(request.user.companyId, filter); }
  @Get('runs/:id') @ApiOkResponse() get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.getRun(request.user.companyId, id); }
  @Post('runs/:id/post') @ApiOkResponse() post(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.postRun(request.user.companyId, request.user.id, id); }
}
