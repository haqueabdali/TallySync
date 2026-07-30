import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WarehouseEntity } from './entities/warehouse.entity';
import { WarehousesService } from './warehouses.service';
describe('WarehousesService',()=>{it('should be defined',async()=>{const m=await Test.createTestingModule({providers:[WarehousesService,{provide:getRepositoryToken(WarehouseEntity),useValue:{}}]}).compile();expect(m.get(WarehousesService)).toBeDefined();});});
