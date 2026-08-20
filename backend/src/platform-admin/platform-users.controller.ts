import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../licensing/guards/platform-admin.guard';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { AssignRoleDto } from '../users/dto/assign-role.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import type { AuthenticatedUser } from '../users/interfaces/authenticated-user.interface';
import { ListPlatformUsersQueryDto } from './dto/list-platform-users-query.dto';
import { PlatformUsersService } from './platform-users.service';

@ApiTags('Platform Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/users')
export class PlatformUsersController {
  constructor(private readonly platformUsersService: PlatformUsersService) {}

  @Get()
  @ApiOperation({ summary: 'List customer-company users for Super Admin' })
  list(@Query() query: ListPlatformUsersQueryDto) {
    return this.platformUsersService.list(query);
  }

  @Get('roles')
  @ApiOperation({ summary: 'List roles available for customer users' })
  roles() {
    return this.platformUsersService.listRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer-company user' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.platformUsersService.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a customer-company user' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.platformUsersService.create(dto, actor, this.extractIp(request));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer-company user' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.platformUsersService.update(id, dto, actor, this.extractIp(request));
  }

  @Post(':id/assign-role')
  @ApiOperation({ summary: 'Assign a role to a customer-company user' })
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.platformUsersService.assignRole(id, dto, actor, this.extractIp(request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a customer-company user' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.platformUsersService.remove(id, actor, this.extractIp(request));
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get audit activity for a customer-company user' })
  activity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.platformUsersService.activity(id, page, limit);
  }

  private extractIp(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length) return forwarded[0];
    return request.socket?.remoteAddress;
  }
}
