import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import type { AuditLogEntity } from '../users/entities/audit-log.entity';
import type { AuditLogListResult } from './interfaces/audit-log-list-result.interface';
import type { AuditLogSummary } from './interfaces/audit-log-summary.interface';
import type { AuditLogAuthenticatedRequest } from './interfaces/audit-log-request.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly service: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List company audit logs' })
  findAll(
    @Req() request: AuditLogAuthenticatedRequest,
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogListResult> {
    return this.service.findAll(request.user.companyId, query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get audit-log summary' })
  getSummary(
    @Req() request: AuditLogAuthenticatedRequest,
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogSummary> {
    return this.service.getSummary(request.user.companyId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one audit log' })
  findOne(
    @Req() request: AuditLogAuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuditLogEntity> {
    return this.service.findOne(request.user.companyId, id);
  }
}
