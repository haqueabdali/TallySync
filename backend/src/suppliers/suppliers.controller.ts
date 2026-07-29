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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditCtx } from '../users/decorators/audit-context.decorator';
import type { AuditContext } from '../users/interfaces/audit-context.interface';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  list(@Query() query: ListSuppliersQueryDto, @AuditCtx() audit: AuditContext) {
    return this.suppliersService.list(query, this.companyId(audit));
  }

  @Get(':id')
  @Roles('admin', 'company_owner', 'vendor', 'sales_rep')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ) {
    return this.suppliersService.getOne(id, this.companyId(audit));
  }

  @Post()
  @Roles('admin', 'company_owner', 'vendor')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSupplierDto, @AuditCtx() audit: AuditContext) {
    return this.suppliersService.create(dto, this.companyId(audit));
  }

  @Patch(':id')
  @Roles('admin', 'company_owner', 'vendor')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
    @AuditCtx() audit: AuditContext,
  ) {
    return this.suppliersService.update(id, dto, this.companyId(audit));
  }

  @Delete(':id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ) {
    return this.suppliersService.remove(id, this.companyId(audit));
  }

  private companyId(audit: AuditContext): string {
    if (!audit.companyId) throw new Error('Authenticated user has no company');
    return audit.companyId;
  }
}
