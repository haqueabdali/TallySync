import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryEntity } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
  ) {}

  async create(
    company_id: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryEntity> {
    const normalizedName = dto.name.trim();

    const existing = await this.categoryRepository.findOne({
      where: {
        company_id,
        name: ILike(normalizedName),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Category "${normalizedName}" already exists`,
      );
    }

    const category = this.categoryRepository.create({
      company_id,
      name: normalizedName,
      description: dto.description?.trim() || null,
      isActive: dto.isActive ?? true,
    });

    return this.categoryRepository.save(category);
  }

  async findAll(
    company_id: string,
    search?: string,
    isActive?: boolean,
  ): Promise<CategoryEntity[]> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.company_id = :company_id', { company_id })
      .orderBy('category.name', 'ASC');

    if (search?.trim()) {
      query.andWhere(
        `(
          category.name ILIKE :search
          OR category.description ILIKE :search
        )`,
        {
          search: `%${search.trim()}%`,
        },
      );
    }

    if (typeof isActive === 'boolean') {
      query.andWhere('category.is_active = :isActive', {
        isActive,
      });
    }

    return query.getMany();
  }

  async findOne(
    company_id: string,
    id: string,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        company_id,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(
    company_id: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryEntity> {
    const category = await this.findOne(company_id, id);

    if (dto.name !== undefined) {
      const normalizedName = dto.name.trim();

      const duplicate = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.company_id = :company_id', { company_id })
        .andWhere('LOWER(category.name) = LOWER(:name)', {
          name: normalizedName,
        })
        .andWhere('category.id != :id', { id })
        .getOne();

      if (duplicate) {
        throw new ConflictException(
          `Category "${normalizedName}" already exists`,
        );
      }

      category.name = normalizedName;
    }

    if (dto.description !== undefined) {
      category.description = dto.description?.trim() || null;
    }

    if (dto.isActive !== undefined) {
      category.isActive = dto.isActive;
    }

    return this.categoryRepository.save(category);
  }

  async remove(
    company_id: string,
    id: string,
  ): Promise<{ message: string }> {
    const category = await this.findOne(company_id, id);

    await this.categoryRepository.softRemove(category);

    return {
      message: 'Category deleted successfully',
    };
  }

  async restore(
    company_id: string,
    id: string,
  ): Promise<CategoryEntity> {
    const category = await this.categoryRepository.findOne({
      where: {
        id,
        company_id,
      },
      withDeleted: true,
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (!category.deletedAt) {
      return category;
    }

    await this.categoryRepository.restore(id);

    return this.findOne(company_id, id);
  }
}