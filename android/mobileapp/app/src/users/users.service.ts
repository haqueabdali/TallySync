import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Brackets, Repository } from 'typeorm';

import {
  buildPaginationMeta,
  getPaginationValues,
} from '../common/utils/pagination.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly passwordRounds = 12;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    await this.ensureEmailIsAvailable(email);

    const user = this.userRepository.create({
      email,
      fullName: dto.fullName.trim(),
      passwordHash: await bcrypt.hash(dto.password, this.passwordRounds),
      role: dto.role,
      isActive: dto.isActive ?? true,
      lastLoginAt: null,
    });

    const saved = await this.userRepository.save(user);
    return this.toPublicUser(saved);
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, skip } = getPaginationValues(query);

    const builder = this.userRepository
      .createQueryBuilder('user')
      .where('user.deletedAt IS NULL');

    if (query.role) {
      builder.andWhere('user.role = :role', { role: query.role });
    }

    const search = query.search?.trim();

    if (search) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('user.email ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('user.fullName ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }

    const [users, total] = await builder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items: users.map((user) => this.toPublicUser(user)),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const user = await this.findEntityById(id);
    return this.toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findEntityById(id);

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();

      if (normalizedEmail !== user.email) {
        await this.ensureEmailIsAvailable(normalizedEmail, id);
        user.email = normalizedEmail;
      }
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName.trim();
    }

    if (dto.password !== undefined) {
      user.passwordHash = await bcrypt.hash(
        dto.password,
        this.passwordRounds,
      );
    }

    if (dto.role !== undefined) {
      user.role = dto.role;
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    const saved = await this.userRepository.save(user);
    return this.toPublicUser(saved);
  }

  async remove(id: string) {
    const user = await this.findEntityById(id);
    await this.userRepository.softRemove(user);

    return {
      id: user.id,
      deleted: true,
    };
  }

  async findByEmailForAuthentication(
    email: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: {
        email: email.trim().toLowerCase(),
      },
      withDeleted: false,
    });
  }

  async findActiveById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: {
        id,
        isActive: true,
      },
      withDeleted: false,
    });
  }

  async markLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLoginAt: new Date(),
    });
  }

  toPublicUser(user: UserEntity) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async findEntityById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id },
      withDeleted: false,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureEmailIsAvailable(
    email: string,
    ignoredUserId?: string,
  ): Promise<void> {
    const existing = await this.userRepository.findOne({
      where: { email },
      withDeleted: true,
    });

    if (existing && existing.id !== ignoredUserId) {
      throw new ConflictException('Email address is already in use');
    }
  }
}
