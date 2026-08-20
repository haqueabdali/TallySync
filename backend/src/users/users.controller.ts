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
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { AssignCompanyDto } from './dto/assign-company.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import type { AuditContext } from './interfaces/audit-context.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'company_owner')
  listUsers(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.listUsers(query, actor);
  }

  @Get('roles')
  @Roles('admin', 'company_owner')
  listRoles() {
    return this.usersService.listRoles();
  }

  @Get(':id')
  @Roles('admin', 'company_owner')
  getUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser | AuditContext,
  ) {
    return this.usersService.getUser(id, actor as AuthenticatedUser);
  }

  getUserById(id: string) {
    return this.usersService.getUserById(id);
  }

  @Post()
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.CREATED)
  createUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser | AuditContext,
  ) {
    return this.usersService.createUser(dto, actor);
  }

  @Patch(':id')
  @Roles('admin', 'company_owner')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser | AuditContext,
    @Req() request?: Request,
  ) {
    if (request)
      return this.usersService.updateUser(
        id,
        dto,
        actor,
        this.extractIp(request),
      );
    return this.usersService.updateUser(id, dto, actor);
  }

  @Delete(':id')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  deleteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser | AuditContext,
    @Req() request?: Request,
  ) {
    if (request)
      return this.usersService.deleteUser(id, actor, this.extractIp(request));
    return this.usersService.deleteUser(id, actor);
  }

  @Post(':id/assign-role')
  @Roles('admin', 'company_owner')
  @HttpCode(HttpStatus.OK)
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: AuthenticatedUser | AuditContext,
    @Req() request?: Request,
  ) {
    if (request)
      return this.usersService.assignRole(
        id,
        dto,
        actor,
        this.extractIp(request),
      );
    return this.usersService.assignRole(id, dto, actor);
  }

  @Post(':id/assign-company')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  assignCompany(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCompanyDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() request?: Request,
  ) {
    if (request)
      return this.usersService.assignCompany(
        id,
        dto,
        actor,
        this.extractIp(request),
      );
    return this.usersService.assignCompany(id, dto, actor);
  }

  @Get(':id/activity')
  @Roles('admin')
  getUserActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.getUserActivity(id, page, limit, actor);
  }

  private extractIp(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    if (Array.isArray(forwarded) && forwarded.length) return forwarded[0];
    return request.socket?.remoteAddress;
  }
}
