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
import { AccountFilterDto } from './dto/account-filter.dto';
import {
  AccountResponseDto,
  AccountTreeNodeResponseDto,
  PaginatedAccountsResponseDto,
} from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { AccountsService } from './accounts.service';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.ACCOUNTING)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an account' })
  @ApiCreatedResponse({ type: AccountResponseDto })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.create(
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List chart of accounts' })
  @ApiOkResponse({ type: PaginatedAccountsResponseDto })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: AccountFilterDto,
  ): Promise<PaginatedAccountsResponseDto> {
    return this.accountsService.findAll(filter, request.user.companyId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get chart of accounts tree' })
  @ApiOkResponse({
    type: AccountTreeNodeResponseDto,
    isArray: true,
  })
  findTree(
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountTreeNodeResponseDto[]> {
    return this.accountsService.findTree(request.user.companyId);
  }

  @Post('seed-default')
  @ApiOperation({ summary: 'Create the default chart of accounts' })
  @ApiCreatedResponse({
    type: AccountResponseDto,
    isArray: true,
  })
  seedDefaultAccounts(
    @Req() request: AuthenticatedRequest,
  ): Promise<AccountResponseDto[]> {
    return this.accountsService.seedDefaultAccounts(
      request.user.companyId,
      request.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account details' })
  @ApiOkResponse({ type: AccountResponseDto })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.findOne(id, request.user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account' })
  @ApiOkResponse({ type: AccountResponseDto })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountsService.update(
      id,
      dto,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate an account' })
  @ApiOkResponse({ type: AccountResponseDto })
  activate(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.activate(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate an account' })
  @ApiOkResponse({ type: AccountResponseDto })
  deactivate(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AccountResponseDto> {
    return this.accountsService.deactivate(
      id,
      request.user.companyId,
      request.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.accountsService.remove(id, request.user.companyId);
  }
}
