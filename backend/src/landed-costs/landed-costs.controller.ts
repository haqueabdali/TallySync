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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CreateLandedCostDto } from './dto/create-landed-cost.dto';
import { LandedCostFilterDto } from './dto/landed-cost-filter.dto';
import {
  LandedCostResponseDto,
  PaginatedLandedCostsResponseDto,
} from './dto/landed-cost-response.dto';
import { UpdateLandedCostDto } from './dto/update-landed-cost.dto';
import type { AuthenticatedLandedCostRequest } from './interfaces/authenticated-request.interface';
import { LandedCostsService } from './landed-costs.service';

@ApiTags('Landed Costs')
@ApiBearerAuth()
@Controller('landed-costs')
export class LandedCostsController {
  constructor(
    private readonly landedCostsService: LandedCostsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a landed cost document' })
  @ApiCreatedResponse({ type: LandedCostResponseDto })
  create(
    @Body() dto: CreateLandedCostDto,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<LandedCostResponseDto> {
    return this.landedCostsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List landed cost documents' })
  @ApiOkResponse({ type: PaginatedLandedCostsResponseDto })
  findAll(
    @Query() filter: LandedCostFilterDto,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<PaginatedLandedCostsResponseDto> {
    return this.landedCostsService.findAll(
      filter,
      request.user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a landed cost document' })
  @ApiOkResponse({ type: LandedCostResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<LandedCostResponseDto> {
    return this.landedCostsService.findOne(
      id,
      request.user.companyId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft landed cost document' })
  @ApiOkResponse({ type: LandedCostResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandedCostDto,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<LandedCostResponseDto> {
    return this.landedCostsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a landed cost document' })
  @ApiOkResponse({ type: LandedCostResponseDto })
  post(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<LandedCostResponseDto> {
    return this.landedCostsService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a landed cost document' })
  @ApiOkResponse({ type: LandedCostResponseDto })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<LandedCostResponseDto> {
    return this.landedCostsService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft landed cost document' })
  @ApiNoContentResponse()
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedLandedCostRequest,
  ): Promise<{ message: string }> {
    return this.landedCostsService.remove(
      id,
      request.user.companyId,
    );
  }
}
