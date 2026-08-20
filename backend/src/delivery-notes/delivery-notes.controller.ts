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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateDeliveryNoteDto } from './dto/create-delivery-note.dto';
import { DeliveryNoteFilterDto } from './dto/delivery-note-filter.dto';
import {
  DeliveryNoteResponseDto,
  PaginatedDeliveryNotesResponseDto,
} from './dto/delivery-note-response.dto';
import { UpdateDeliveryNoteDto } from './dto/update-delivery-note.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { DeliveryNotesService } from './delivery-notes.service';

@ApiTags('Delivery Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.SALES)
@Controller('delivery-notes')
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a delivery note' })
  @ApiCreatedResponse({ type: DeliveryNoteResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateDeliveryNoteDto,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotesService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List delivery notes' })
  @ApiOkResponse({ type: PaginatedDeliveryNotesResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: DeliveryNoteFilterDto,
  ): Promise<PaginatedDeliveryNotesResponseDto> {
    return this.deliveryNotesService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery note details' })
  @ApiOkResponse({ type: DeliveryNoteResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotesService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft delivery note' })
  @ApiOkResponse({ type: DeliveryNoteResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryNoteDto,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotesService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a delivery note' })
  @ApiOkResponse({ type: DeliveryNoteResponseDto })
  postDeliveryNote(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotesService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a delivery note' })
  @ApiOkResponse({ type: DeliveryNoteResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DeliveryNoteResponseDto> {
    return this.deliveryNotesService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft delivery note' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.deliveryNotesService.remove(id, request.user.companyId);
  }
}
