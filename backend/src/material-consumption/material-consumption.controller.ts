import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateMaterialConsumptionDto } from './dto/create-material-consumption.dto';
import { MaterialConsumptionFilterDto } from './dto/material-consumption-filter.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { MaterialConsumptionService } from './material-consumption.service';

@ApiTags('Material Consumption')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MANUFACTURING)
@Controller('material-consumptions')
export class MaterialConsumptionController {
  constructor(private readonly service: MaterialConsumptionService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Material consumption posted.' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMaterialConsumptionDto,
  ) {
    return this.service.create(request.user.companyId, request.user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated material consumptions.' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: MaterialConsumptionFilterDto,
  ) {
    return this.service.findAll(request.user.companyId, filter);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Material consumption details.' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.findOne(request.user.companyId, id);
  }
}
