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
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JournalEntryFilterDto } from './dto/journal-entry-filter.dto';
import {
  JournalEntryResponseDto,
  PaginatedJournalEntriesResponseDto,
} from './dto/journal-entry-response.dto';
import { ReverseJournalEntryDto } from './dto/reverse-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { JournalEntriesService } from './journal-entries.service';

@ApiTags('Journal Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.ACCOUNTING)
@Controller('journal-entries')
export class JournalEntriesController {
  constructor(private readonly journalEntriesService: JournalEntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a journal entry' })
  @ApiCreatedResponse({ type: JournalEntryResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List journal entries' })
  @ApiOkResponse({ type: PaginatedJournalEntriesResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: JournalEntryFilterDto,
  ): Promise<PaginatedJournalEntriesResponseDto> {
    return this.journalEntriesService.findAll(filter, request.user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get journal entry details' })
  @ApiOkResponse({ type: JournalEntryResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a draft journal entry' })
  @ApiOkResponse({ type: JournalEntryResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/post')
  @ApiOperation({ summary: 'Post a journal entry' })
  @ApiOkResponse({ type: JournalEntryResponseDto })
  postEntry(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.post(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a posted journal entry' })
  @ApiOkResponse({ type: JournalEntryResponseDto })
  reverse(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReverseJournalEntryDto,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.reverse(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a draft journal entry' })
  @ApiOkResponse({ type: JournalEntryResponseDto })
  cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JournalEntryResponseDto> {
    return this.journalEntriesService.cancel(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft journal entry' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.journalEntriesService.remove(id, request.user.companyId);
  }
}
