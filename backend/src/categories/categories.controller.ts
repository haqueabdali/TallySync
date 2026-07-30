import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    company_id: string;
    role?: string;
  };
}

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(
      request.user.company_id,
      dto,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'electronics',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
  })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.categoriesService.findAll(
      request.user.company_id,
      search,
      isActive,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one category' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.findOne(
      request.user.company_id,
      id,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      request.user.company_id,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a category' })
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.remove(
      request.user.company_id,
      id,
    );
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted category' })
  restore(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.categoriesService.restore(
      request.user.company_id,
      id,
    );
  }
}