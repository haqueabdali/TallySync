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
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignCompanyDto } from './dto/assign-company.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  UserResponseDto,
  PaginatedUsersResponseDto,
  PaginatedActivityResponseDto,
} from './dto/user-response.dto';

import { AuditCtx } from './decorators/audit-context.decorator';
import type { AuditContext } from './interfaces/audit-context.interface';
// Re-use guards & decorators from the auth module
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── POST /api/v1/users ─────────────────────────────────────────────────────
  @Post()
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() dto: CreateUserDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<UserResponseDto> {
    return this.usersService.createUser(dto, audit);
  }

  // ── GET /api/v1/users ──────────────────────────────────────────────────────
  @Get()
  @Roles('admin')
  listUsers(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.listUsers(query);
  }

  // ── GET /api/v1/users/:id ──────────────────────────────────────────────────
  @Get(':id')
  @Roles('admin')
  getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserById(id);
  }

  // ── PATCH /api/v1/users/:id ────────────────────────────────────────────────
  @Patch(':id')
  @Roles('admin')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, dto, audit);
  }

  // ── DELETE /api/v1/users/:id ───────────────────────────────────────────────
  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @AuditCtx() audit: AuditContext,
  ): Promise<void> {
    return this.usersService.deleteUser(id, audit);
  }

  // ── POST /api/v1/users/:id/assign-role ────────────────────────────────────
  @Post(':id/assign-role')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<UserResponseDto> {
    return this.usersService.assignRole(id, dto, audit);
  }

  // ── POST /api/v1/users/:id/assign-company ─────────────────────────────────
  @Post(':id/assign-company')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  assignCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCompanyDto,
    @AuditCtx() audit: AuditContext,
  ): Promise<UserResponseDto> {
    return this.usersService.assignCompany(id, dto, audit);
  }

  // ── GET /api/v1/users/:id/activity ────────────────────────────────────────
  @Get(':id/activity')
  @Roles('admin')
  getUserActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): Promise<PaginatedActivityResponseDto> {
    return this.usersService.getUserActivity(id, page, limit);
  }
}
