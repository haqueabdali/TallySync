import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../licensing/guards/platform-admin.guard';
import { CreatePlatformCompanyDto } from './dto/create-platform-company.dto';
import { ListPlatformCompaniesQueryDto } from './dto/list-platform-companies-query.dto';
import { UpdatePlatformCompanyDto } from './dto/update-platform-company.dto';
import { PlatformCompaniesService } from './platform-companies.service';

@ApiTags('Platform Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/companies')
export class PlatformCompaniesController {
  constructor(
    private readonly platformCompaniesService: PlatformCompaniesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List customer companies for Super Admin' })
  list(@Query() query: ListPlatformCompaniesQueryDto) {
    return this.platformCompaniesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer company commercial summary' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.platformCompaniesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a customer company from Super Admin' })
  create(@Body() dto: CreatePlatformCompanyDto) {
    return this.platformCompaniesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update or activate/deactivate a customer company' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlatformCompanyDto,
  ) {
    return this.platformCompaniesService.update(id, dto);
  }
}
