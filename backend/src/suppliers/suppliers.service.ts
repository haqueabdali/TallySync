import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { ListSuppliersQueryDto } from './dto/list-suppliers-query.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierEntity } from './entities/supplier.entity';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(SupplierEntity)
    private readonly supplierRepository: Repository<SupplierEntity>,
  ) {}

  async list(query: ListSuppliersQueryDto, companyId: string) {
    const builder = this.supplierRepository
      .createQueryBuilder('supplier')
      .where('supplier.companyId = :companyId', { companyId })
      .andWhere('supplier.deletedAt IS NULL')
      .orderBy('supplier.name', 'ASC')
      .take(200);

    const search = query.search?.trim();
    if (search) {
      builder.andWhere(
        new Brackets((where) => {
          where
            .where('supplier.name ILIKE :search', { search: `%${search}%` })
            .orWhere('supplier.contactPerson ILIKE :search', {
              search: `%${search}%`,
            })
            .orWhere('supplier.email ILIKE :search', { search: `%${search}%` })
            .orWhere('supplier.phone ILIKE :search', { search: `%${search}%` })
            .orWhere('supplier.taxNumber ILIKE :search', {
              search: `%${search}%`,
            });
        }),
      );
    }
    if (query.active !== undefined) {
      builder.andWhere('supplier.isActive = :active', { active: query.active });
    }
    return this.wrap(await builder.getMany(), 'Suppliers loaded successfully');
  }

  async getOne(id: string, companyId: string) {
    return this.wrap(
      await this.findOne(id, companyId),
      'Supplier loaded successfully',
    );
  }

  async create(dto: CreateSupplierDto, companyId: string) {
    const supplier = this.supplierRepository.create({
      ...dto,
      companyId,
      name: dto.name.trim(),
      contactPerson: dto.contactPerson?.trim() ?? null,
      email: dto.email?.trim().toLowerCase() ?? null,
      phone: dto.phone?.trim() ?? null,
      address: dto.address?.trim() ?? null,
      taxNumber: dto.taxNumber?.trim() ?? null,
      paymentTermsDays: dto.paymentTermsDays ?? 0,
      openingBalance: dto.openingBalance ?? 0,
      isActive: dto.isActive ?? true,
      notes: dto.notes?.trim() ?? null,
    });
    try {
      return this.wrap(
        await this.supplierRepository.save(supplier),
        'Supplier created successfully',
      );
    } catch (error) {
      this.handleConstraint(error);
    }
  }

  async update(id: string, dto: UpdateSupplierDto, companyId: string) {
    const supplier = await this.findOne(id, companyId);
    Object.assign(supplier, dto);
    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.contactPerson !== undefined)
      supplier.contactPerson = dto.contactPerson?.trim() || null;
    if (dto.email !== undefined)
      supplier.email = dto.email?.trim().toLowerCase() || null;
    if (dto.phone !== undefined) supplier.phone = dto.phone?.trim() || null;
    if (dto.address !== undefined)
      supplier.address = dto.address?.trim() || null;
    if (dto.taxNumber !== undefined)
      supplier.taxNumber = dto.taxNumber?.trim() || null;
    if (dto.notes !== undefined) supplier.notes = dto.notes?.trim() || null;
    try {
      return this.wrap(
        await this.supplierRepository.save(supplier),
        'Supplier updated successfully',
      );
    } catch (error) {
      this.handleConstraint(error);
    }
  }

  async remove(id: string, companyId: string): Promise<void> {
    const supplier = await this.findOne(id, companyId);
    await this.supplierRepository.softRemove(supplier);
  }

  private async findOne(
    id: string,
    companyId: string,
  ): Promise<SupplierEntity> {
    const supplier = await this.supplierRepository.findOne({
      where: { id, companyId, deletedAt: IsNull() },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private wrap<T>(data: T, message: string) {
    return { success: true, message, data };
  }

  private handleConstraint(error: unknown): never {
    const code = (error as { code?: string })?.code;
    if (code === '23505')
      throw new BadRequestException(
        'A supplier with this tax number already exists',
      );
    throw error;
  }
}
