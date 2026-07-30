import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierFilterDto } from './dto/supplier-filter.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierEntity } from './entities/supplier.entity';
import type { PaginatedResult } from './interfaces/supplier-search.interface';

@Injectable()
export class SuppliersService {
  constructor(@InjectRepository(SupplierEntity) private readonly repo: Repository<SupplierEntity>) {}

  async create(companyId: string, userId: string, dto: CreateSupplierDto): Promise<SupplierResponseDto> {
    await this.ensureEmail(companyId, dto.email);
    const supplierCode = await this.generateCode(companyId);
    const supplier = this.repo.create({ ...dto, companyId, supplierCode, email: this.opt(dto.email), companyName: this.opt(dto.companyName), contactPerson: this.opt(dto.contactPerson), phone: this.opt(dto.phone), mobile: this.opt(dto.mobile), taxNumber: this.opt(dto.taxNumber), vatNumber: this.opt(dto.vatNumber), billingAddress: this.opt(dto.billingAddress), shippingAddress: this.opt(dto.shippingAddress), city: this.opt(dto.city), state: this.opt(dto.state), postalCode: this.opt(dto.postalCode), country: this.opt(dto.country), notes: this.opt(dto.notes), creditLimit: dto.creditLimit ?? 0, openingBalance: dto.openingBalance ?? 0, currentBalance: dto.openingBalance ?? 0, currency: (dto.currency ?? 'EUR').toUpperCase(), paymentTerms: dto.paymentTerms ?? 0, isActive: dto.isActive ?? true, createdBy: userId, updatedBy: userId });
    try { return this.map(await this.repo.save(supplier)); } catch (e) { this.conflict(e); }
  }

  async findAll(companyId: string, f: SupplierFilterDto): Promise<PaginatedResult<SupplierResponseDto>> {
    const page=f.page??1, limit=f.limit??20;
    const q=this.repo.createQueryBuilder('supplier').where('supplier.company_id = :companyId',{companyId});
    if(f.search?.trim()){const search=`%${f.search.trim()}%`;q.andWhere(new Brackets(qb=>qb.where('supplier.name ILIKE :search',{search}).orWhere('supplier.supplier_code ILIKE :search',{search}).orWhere('supplier.company_name ILIKE :search',{search}).orWhere('supplier.email ILIKE :search',{search}).orWhere('supplier.phone ILIKE :search',{search})));}
    if(f.city) q.andWhere('supplier.city ILIKE :city',{city:`%${f.city.trim()}%`});
    if(f.country) q.andWhere('supplier.country ILIKE :country',{country:`%${f.country.trim()}%`});
    if(f.isActive!==undefined) q.andWhere('supplier.is_active = :isActive',{isActive:f.isActive});
    const map:Record<string,string>={name:'supplier.name',supplierCode:'supplier.supplier_code',city:'supplier.city',country:'supplier.country',currentBalance:'supplier.current_balance',createdAt:'supplier.created_at',updatedAt:'supplier.updated_at'};
    q.orderBy(map[f.sortBy]??'supplier.created_at',f.sortOrder).addOrderBy('supplier.id','DESC').skip((page-1)*limit).take(limit);
    const [rows,total]=await q.getManyAndCount(); const totalPages=total===0?0:Math.ceil(total/limit);
    return {data:rows.map(x=>this.map(x)),meta:{page,limit,total,totalPages,hasNextPage:page<totalPages,hasPreviousPage:page>1}};
  }

  async findOne(companyId:string,id:string){return this.map(await this.get(companyId,id));}
  async findByCode(companyId:string,supplierCode:string){const s=await this.repo.findOne({where:{companyId,supplierCode}});if(!s)throw new NotFoundException('Supplier not found');return this.map(s);}
  async update(companyId:string,userId:string,id:string,dto:UpdateSupplierDto){const s=await this.get(companyId,id);if(dto.email!==undefined)await this.ensureEmail(companyId,dto.email,id);const oldOpen=Number(s.openingBalance),oldCurrent=Number(s.currentBalance);Object.assign(s,dto);if(dto.email!==undefined)s.email=this.opt(dto.email);if(dto.currency!==undefined)s.currency=dto.currency.toUpperCase();if(dto.openingBalance!==undefined)s.currentBalance=oldCurrent-oldOpen+dto.openingBalance;s.updatedBy=userId;try{return this.map(await this.repo.save(s));}catch(e){this.conflict(e);}}
  async updateStatus(companyId:string,userId:string,id:string,isActive:boolean){const s=await this.get(companyId,id);s.isActive=isActive;s.updatedBy=userId;return this.map(await this.repo.save(s));}
  async remove(companyId:string,id:string){await this.repo.softRemove(await this.get(companyId,id));return{message:'Supplier deleted successfully'};}
  async restore(companyId:string,userId:string,id:string){const s=await this.repo.findOne({where:{id,companyId},withDeleted:true});if(!s)throw new NotFoundException('Supplier not found');if(s.deletedAt)await this.repo.restore({id,companyId});s.deletedAt=null;s.updatedBy=userId;return this.map(await this.repo.save(s));}

  private async get(companyId:string,id:string){const s=await this.repo.findOne({where:{id,companyId}});if(!s)throw new NotFoundException('Supplier not found');return s;}
  private async ensureEmail(companyId:string,email?:string,excludeId?:string){const value=this.opt(email)?.toLowerCase();if(!value)return;const q=this.repo.createQueryBuilder('supplier').withDeleted().where('supplier.company_id = :companyId',{companyId}).andWhere('LOWER(supplier.email) = :email',{email:value});if(excludeId)q.andWhere('supplier.id <> :excludeId',{excludeId});if(await q.getExists())throw new ConflictException('Supplier email already exists');}
  private async generateCode(companyId:string){const latest=await this.repo.createQueryBuilder('supplier').withDeleted().select('supplier.supplier_code','supplierCode').where('supplier.company_id = :companyId',{companyId}).andWhere("supplier.supplier_code ~ '^SUP-[0-9]+$'").orderBy("CAST(SUBSTRING(supplier.supplier_code FROM 5) AS INTEGER)",'DESC').getRawOne<{supplierCode?:string}>();const current=latest?.supplierCode?Number(latest.supplierCode.replace('SUP-','')):0;return `SUP-${String(current+1).padStart(6,'0')}`;}
  private opt(v?:string){const x=v?.trim();return x||null;}
  private map(s:SupplierEntity):SupplierResponseDto{return{id:s.id,companyId:s.companyId,supplierCode:s.supplierCode,name:s.name,companyName:s.companyName,contactPerson:s.contactPerson,email:s.email,phone:s.phone,mobile:s.mobile,taxNumber:s.taxNumber,vatNumber:s.vatNumber,billingAddress:s.billingAddress,shippingAddress:s.shippingAddress,city:s.city,state:s.state,postalCode:s.postalCode,country:s.country,creditLimit:Number(s.creditLimit),openingBalance:Number(s.openingBalance),currentBalance:Number(s.currentBalance),currency:s.currency,paymentTerms:s.paymentTerms,notes:s.notes,isActive:s.isActive,createdAt:s.createdAt,updatedAt:s.updatedAt,deletedAt:s.deletedAt};}
  private conflict(e:unknown):never{if(e instanceof QueryFailedError){const d=e.driverError as {code?:string;constraint?:string};if(d.code==='23505'){if(d.constraint?.includes('email'))throw new ConflictException('Supplier email already exists');if(d.constraint?.includes('code'))throw new ConflictException('Supplier code already exists');throw new ConflictException('Supplier already exists');}}throw e;}
}
