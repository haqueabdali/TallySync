import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, Repository } from 'typeorm';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { WarehouseFilterDto } from './dto/warehouse-filter.dto';
import { WarehouseResponseDto } from './dto/warehouse-response.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseEntity } from './entities/warehouse.entity';
export interface Page {
   data: WarehouseResponseDto[];
   meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
   };
}
@Injectable()
export class WarehousesService {
 constructor(@InjectRepository(WarehouseEntity) private readonly repo:Repository<WarehouseEntity>){}
 async create(companyId:string,userId:string,dto:CreateWarehouseDto):Promise<WarehouseResponseDto>{const code=await this.generateCode(companyId);const anyDefault=await this.repo.exists({where:{companyId,isDefault:true}});const isDefault=dto.isDefault===true||!anyDefault;if(isDefault)await this.clearDefault(companyId);const e=this.repo.create({...dto,companyId,warehouseCode:code,description:this.opt(dto.description),contactPerson:this.opt(dto.contactPerson),phone:this.opt(dto.phone),email:this.opt(dto.email)?.toLowerCase()??null,address:this.opt(dto.address),city:this.opt(dto.city),state:this.opt(dto.state),postalCode:this.opt(dto.postalCode),country:this.opt(dto.country),isDefault,isActive:dto.isActive??true,createdBy:userId,updatedBy:userId});try{return this.map(await this.repo.save(e));}catch(err){this.dbError(err);}}
 async findAll(companyId:string,f:WarehouseFilterDto):Promise<Page>{const page=f.page??1,limit=f.limit??20;const q=this.repo.createQueryBuilder('w').where('w.company_id = :companyId',{companyId});if(f.search?.trim()){const search=`%${f.search.trim()}%`;q.andWhere(new Brackets(b=>b.where('w.name ILIKE :search',{search}).orWhere('w.warehouse_code ILIKE :search',{search}).orWhere('w.city ILIKE :search',{search})));}if(f.city)q.andWhere('w.city ILIKE :city',{city:`%${f.city.trim()}%`});if(f.country)q.andWhere('w.country ILIKE :country',{country:`%${f.country.trim()}%`});if(f.isActive!==undefined)q.andWhere('w.is_active = :isActive',{isActive:f.isActive});if(f.isDefault!==undefined)q.andWhere('w.is_default = :isDefault',{isDefault:f.isDefault});const cols:Record<string,string>={name:'w.name',warehouseCode:'w.warehouse_code',city:'w.city',country:'w.country',createdAt:'w.created_at',updatedAt:'w.updated_at'};q.orderBy(cols[f.sortBy]??'w.created_at',f.sortOrder).addOrderBy('w.id','DESC').skip((page-1)*limit).take(limit);const [rows,total]=await q.getManyAndCount();const totalPages=total===0?0:Math.ceil(total/limit);return{data:rows.map(x=>this.map(x)),meta:{page,limit,total,totalPages,hasNextPage:page<totalPages,hasPreviousPage:page>1}};}
 async findOne(companyId:string,id:string){return this.map(await this.get(companyId,id));}
 async findByCode(companyId:string,warehouseCode:string){const e=await this.repo.findOne({where:{companyId,warehouseCode}});if(!e)throw new NotFoundException('Warehouse not found');return this.map(e);}
 async update(companyId:string,userId:string,id:string,dto:UpdateWarehouseDto){const e=await this.get(companyId,id);if(dto.isDefault===true&&!e.isDefault)await this.clearDefault(companyId);Object.assign(e,dto);if(dto.description!==undefined)e.description=this.opt(dto.description);if(dto.contactPerson!==undefined)e.contactPerson=this.opt(dto.contactPerson);if(dto.phone!==undefined)e.phone=this.opt(dto.phone);if(dto.email!==undefined)e.email=this.opt(dto.email)?.toLowerCase()??null;if(dto.address!==undefined)e.address=this.opt(dto.address);if(dto.city!==undefined)e.city=this.opt(dto.city);if(dto.state!==undefined)e.state=this.opt(dto.state);if(dto.postalCode!==undefined)e.postalCode=this.opt(dto.postalCode);if(dto.country!==undefined)e.country=this.opt(dto.country);e.updatedBy=userId;return this.map(await this.repo.save(e));}
 async updateStatus(companyId:string,userId:string,id:string,isActive:boolean){const e=await this.get(companyId,id);if(!isActive&&e.isDefault)throw new ConflictException('The default warehouse cannot be deactivated');e.isActive=isActive;e.updatedBy=userId;return this.map(await this.repo.save(e));}
 async setDefault(companyId:string,userId:string,id:string){const e=await this.get(companyId,id);if(!e.isActive)throw new ConflictException('An inactive warehouse cannot be set as default');await this.clearDefault(companyId);e.isDefault=true;e.updatedBy=userId;return this.map(await this.repo.save(e));}
 async remove(companyId:string,id:string){const e=await this.get(companyId,id);if(e.isDefault)throw new ConflictException('The default warehouse cannot be deleted');await this.repo.softRemove(e);return{message:'Warehouse deleted successfully'};}
 async restore(companyId:string,userId:string,id:string){const e=await this.repo.findOne({where:{id,companyId},withDeleted:true});if(!e)throw new NotFoundException('Warehouse not found');if(e.deletedAt)await this.repo.restore({id,companyId});e.deletedAt=null;e.updatedBy=userId;return this.map(await this.repo.save(e));}
 private async get(companyId:string,id:string){const e=await this.repo.findOne({where:{id,companyId}});if(!e)throw new NotFoundException('Warehouse not found');return e;}
 private async clearDefault(companyId:string){await this.repo.createQueryBuilder().update(WarehouseEntity).set({isDefault:false}).where('company_id = :companyId',{companyId}).andWhere('is_default = true').execute();}
 private async generateCode(companyId:string){const r=await this.repo.createQueryBuilder('w').withDeleted().select('w.warehouse_code','warehouseCode').where('w.company_id = :companyId',{companyId}).andWhere("w.warehouse_code ~ '^WH-[0-9]+$'").orderBy("CAST(SUBSTRING(w.warehouse_code FROM 4) AS INTEGER)",'DESC').getRawOne<{warehouseCode?:string}>();const n=r?.warehouseCode?Number(r.warehouseCode.replace('WH-','')):0;return`WH-${String(n+1).padStart(6,'0')}`;}
 private opt(v?:string){const x=v?.trim();return x?x:null;}
 private map(e:WarehouseEntity):WarehouseResponseDto{return{id:e.id,companyId:e.companyId,warehouseCode:e.warehouseCode,name:e.name,description:e.description,contactPerson:e.contactPerson,phone:e.phone,email:e.email,address:e.address,city:e.city,state:e.state,postalCode:e.postalCode,country:e.country,isDefault:e.isDefault,isActive:e.isActive,createdAt:e.createdAt,updatedAt:e.updatedAt,deletedAt:e.deletedAt};}
 private dbError(err:unknown):never{if(err instanceof QueryFailedError){const d=err.driverError as{code?:string};if(d.code==='23505')throw new ConflictException('Warehouse code already exists');}throw err;}
}
