import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliationFilterDto } from './dto/bank-reconciliation-filter.dto';
import { CreateBankReconciliationDto } from './dto/create-bank-reconciliation.dto';
import { CreateBankReconciliationMatchDto } from './dto/create-bank-reconciliation-match.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
@ApiTags('Bank Reconciliation') @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Controller('bank-reconciliations')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}
  @Post() @ApiCreatedResponse() create(@Req() request: AuthenticatedRequest, @Body() dto: CreateBankReconciliationDto) { return this.service.create(request.user.companyId, request.user.id, dto); }
  @Get() @ApiOkResponse() list(@Req() request: AuthenticatedRequest, @Query() filter: BankReconciliationFilterDto) { return this.service.list(request.user.companyId, filter); }
  @Get(':id') @ApiOkResponse() get(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.get(request.user.companyId, id); }
  @Post(':id/lines/:lineId/matches') @ApiOperation({ summary: 'Match a statement line to a posted bank journal line' }) match(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('lineId', ParseUUIDPipe) lineId: string, @Body() dto: CreateBankReconciliationMatchDto) { return this.service.match(request.user.companyId, request.user.id, id, lineId, dto); }
  @Delete(':id/lines/:lineId/matches/:matchId') @ApiOkResponse() unmatch(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Param('lineId', ParseUUIDPipe) lineId: string, @Param('matchId', ParseUUIDPipe) matchId: string) { return this.service.unmatch(request.user.companyId, id, lineId, matchId); }
  @Post(':id/reconcile') @ApiOkResponse() reconcile(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) { return this.service.reconcile(request.user.companyId, request.user.id, id); }
}
