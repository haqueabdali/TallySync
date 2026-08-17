import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { BackgroundJobQueryDto } from './dto/background-job-query.dto';
import { CreateBackgroundJobDto } from './dto/create-background-job.dto';
import {
  BackgroundJobsService,
  type BackgroundJobListResult,
} from './background-jobs.service';

@ApiTags('Background Jobs')
@ApiBearerAuth()
@Controller('background-jobs')
@UseGuards(JwtAuthGuard)
export class BackgroundJobsController {
  constructor(private readonly service: BackgroundJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Enqueue a background job' })
  enqueue(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBackgroundJobDto,
  ) {
    return this.service.enqueue(this.requireCompanyId(user), dto);
  }

  @Get()
@ApiOperation({ summary: 'List company background jobs' })
findAll(
  @CurrentUser() user: AuthenticatedUser,
  @Query() query: BackgroundJobQueryDto,
): Promise<BackgroundJobListResult> {
  return this.service.findAll(
    this.requireCompanyId(user),
    query,
  );
}

  @Get('stats')
  @ApiOperation({ summary: 'Get background job counts by status' })
  stats(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getStats(this.requireCompanyId(user));
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findOne(this.requireCompanyId(user), id);
  }

  @Post(':id/retry')
  retry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.retry(this.requireCompanyId(user), id);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancel(this.requireCompanyId(user), id);
  }

  private requireCompanyId(user: AuthenticatedUser): string {
    if (!user.companyId) {
      throw new BadRequestException('A company context is required');
    }
    return user.companyId;
  }
}
