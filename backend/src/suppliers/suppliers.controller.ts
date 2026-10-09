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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { RequestSupplierPermanentDeleteDto } from './dto/request-supplier-permanent-delete.dto';
import { SupplierFilterDto } from './dto/supplier-filter.dto';
import {
  PaginatedSuppliersResponseDto,
  SupplierResponseDto,
} from './dto/supplier-response.dto';
import { UpdateSupplierStatusDto } from './dto/update-supplier-status.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { SupplierDeletionApprovalService } from './supplier-deletion-approval.service';
import { SuppliersService } from './suppliers.service';

@RequireLicenseFeature(LicensedFeature.PURCHASE)
@ApiTags('Suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly service: SuppliersService,
    private readonly deletionApprovalService: SupplierDeletionApprovalService,
  ) {}
  @Post()
  @ApiOperation({ summary: 'Create a supplier' })
  @ApiCreatedResponse({ type: SupplierResponseDto })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateSupplierDto) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }
  @Get()
  @ApiOperation({ summary: 'List suppliers' })
  @ApiOkResponse({ type: PaginatedSuppliersResponseDto })
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() filter: SupplierFilterDto,
  ) {
    return this.service.findAll(req.user.companyId, filter);
  }
  @Get('code/:code') findByCode(
    @Req() req: AuthenticatedRequest,
    @Param('code') code: string,
  ) {
    return this.service.findByCode(req.user.companyId, code);
  }
  @Get(':id') findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(req.user.companyId, id);
  }
  @Patch(':id') update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.service.update(req.user.companyId, req.user.id, id, dto);
  }
  @Patch(':id/status') updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierStatusDto,
  ) {
    return this.service.updateStatus(
      req.user.companyId,
      req.user.id,
      id,
      dto.isActive,
    );
  }
  @Patch(':id/restore') restore(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.restore(req.user.companyId, req.user.id, id);
  }
  @Post(':id/permanent-delete-requests')
  @Roles('admin', 'company_owner')
  requestPermanentDeletion(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestSupplierPermanentDeleteDto,
  ) {
    return this.deletionApprovalService.requestPermanentDeletion(
      req.user.companyId,
      req.user.id,
      req.user.role,
      id,
      dto.reason,
    );
  }

  @Get('permanent-delete-requests/:requestId')
  @Roles('admin', 'company_owner')
  getPermanentDeletionRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.deletionApprovalService.findOne(
      req.user.companyId,
      requestId,
    );
  }

  @Post('permanent-delete-requests/:requestId/approve')
  @Roles('admin', 'company_owner')
  approvePermanentDeletion(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.deletionApprovalService.approve(
      req.user.companyId,
      req.user.id,
      req.user.role,
      requestId,
    );
  }

  @Post('permanent-delete-requests/:requestId/execute')
  @Roles('admin', 'company_owner')
  executePermanentDeletion(
    @Req() req: AuthenticatedRequest,
    @Param('requestId', ParseUUIDPipe) requestId: string,
  ) {
    return this.deletionApprovalService.execute(
      req.user.companyId,
      req.user.id,
      req.user.role,
      requestId,
    );
  }

  @Delete(':id') remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(req.user.companyId, id);
  }
}
