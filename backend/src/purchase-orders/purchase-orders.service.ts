import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { PurchaseOrderFilterDto } from './dto/purchase-order-filter.dto';
import {
  PurchaseOrderResponseDto,
  PurchaseOrderItemResponseDto,
  PaginatedPurchaseOrdersResponseDto,
} from './dto/purchase-order-response.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { PurchaseOrderEntity } from './entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from './entities/purchase-order-item.entity';
import { PurchaseOrderStatus } from './enums/purchase-order-status.enum';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrderEntity) private readonly orderRepository: Repository<PurchaseOrderEntity>,
    @InjectRepository(PurchaseOrderItemEntity) private readonly itemRepository: Repository<PurchaseOrderItemEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(companyId: string, userId: string, dto: CreatePurchaseOrderDto): Promise<PurchaseOrderResponseDto> {
    this.ensureUniqueItems(dto.items.map((item) => item.itemId));
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrderEntity);
      const itemRepo = manager.getRepository(PurchaseOrderItemEntity);
      const order = orderRepo.create({
        companyId, supplierId: dto.supplierId, warehouseId: dto.warehouseId,
        poNumber: await this.generatePoNumber(companyId, dto.poDate), poDate: dto.poDate,
        expectedDate: dto.expectedDate ?? null, status: PurchaseOrderStatus.DRAFT,
        currency: (dto.currency ?? 'EUR').toUpperCase(), subtotal: 0, discountTotal: 0,
        taxTotal: 0, shippingTotal: dto.shippingTotal ?? 0, grandTotal: 0,
        notes: this.optional(dto.notes), createdBy: userId, updatedBy: userId, items: [],
      });
      const saved = await orderRepo.save(order);
      saved.items = await itemRepo.save(dto.items.map((line) => {
        const totals = this.calculateLine(line.quantity, line.unitPrice, line.discountPercent ?? 0, line.taxPercent ?? 0);
        return itemRepo.create({ purchaseOrderId: saved.id, itemId: line.itemId, description: this.optional(line.description), quantity: line.quantity, receivedQuantity: 0, unitPrice: line.unitPrice, discountPercent: line.discountPercent ?? 0, taxPercent: line.taxPercent ?? 0, ...totals });
      }));
      this.calculateOrderTotals(saved);
      return this.map(await orderRepo.save(saved));
    });
  }

async findAll(
  companyId: string,
  filter: PurchaseOrderFilterDto,
): Promise<PaginatedPurchaseOrdersResponseDto> {
    const page = filter.page ?? 1; const limit = filter.limit ?? 20;
    const query = this.orderRepository.createQueryBuilder('purchaseOrder').leftJoinAndSelect('purchaseOrder.items', 'items').where('purchaseOrder.company_id = :companyId', { companyId });
    if (filter.search?.trim()) query.andWhere(new Brackets((qb) => qb.where('purchaseOrder.po_number ILIKE :search', { search: `%${filter.search?.trim()}%` }).orWhere('purchaseOrder.notes ILIKE :search', { search: `%${filter.search?.trim()}%` })));
    if (filter.supplierId) query.andWhere('purchaseOrder.supplier_id = :supplierId', { supplierId: filter.supplierId });
    if (filter.warehouseId) query.andWhere('purchaseOrder.warehouse_id = :warehouseId', { warehouseId: filter.warehouseId });
    if (filter.status) query.andWhere('purchaseOrder.status = :status', { status: filter.status });
    if (filter.dateFrom) query.andWhere('purchaseOrder.po_date >= :dateFrom', { dateFrom: filter.dateFrom });
    if (filter.dateTo) query.andWhere('purchaseOrder.po_date <= :dateTo', { dateTo: filter.dateTo });
    const sortColumns: Record<string,string> = { poNumber:'purchaseOrder.po_number', poDate:'purchaseOrder.po_date', expectedDate:'purchaseOrder.expected_date', grandTotal:'purchaseOrder.grand_total', createdAt:'purchaseOrder.created_at', updatedAt:'purchaseOrder.updated_at' };
    query.orderBy(sortColumns[filter.sortBy] ?? 'purchaseOrder.created_at', filter.sortOrder).addOrderBy('purchaseOrder.id','DESC').skip((page-1)*limit).take(limit).distinct(true);
    const [orders,total] = await query.getManyAndCount(); const totalPages = total === 0 ? 0 : Math.ceil(total/limit);
    return { data: orders.map((order) => this.map(order)), meta: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 } };
  }

  async findOne(companyId: string, id: string): Promise<PurchaseOrderResponseDto> { return this.map(await this.getEntity(companyId,id)); }

  async update(companyId: string, userId: string, id: string, dto: UpdatePurchaseOrderDto): Promise<PurchaseOrderResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(PurchaseOrderEntity); const itemRepo = manager.getRepository(PurchaseOrderItemEntity);
      const order = await orderRepo.findOne({ where: { id, companyId }, relations: { items: true } });
      if (!order) throw new NotFoundException('Purchase order not found');
      this.ensureEditable(order);
      if (dto.items) {
        this.ensureUniqueItems(dto.items.map((item) => item.itemId)); await itemRepo.delete({ purchaseOrderId: order.id });
        order.items = await itemRepo.save(dto.items.map((line) => { const totals = this.calculateLine(line.quantity,line.unitPrice,line.discountPercent ?? 0,line.taxPercent ?? 0); return itemRepo.create({ purchaseOrderId: order.id,itemId: line.itemId,description: this.optional(line.description),quantity: line.quantity,receivedQuantity:0,unitPrice:line.unitPrice,discountPercent:line.discountPercent ?? 0,taxPercent:line.taxPercent ?? 0,...totals }); }));
      }
      if (dto.supplierId !== undefined) order.supplierId = dto.supplierId;
      if (dto.warehouseId !== undefined) order.warehouseId = dto.warehouseId;
      if (dto.poDate !== undefined) order.poDate = dto.poDate;
      if (dto.expectedDate !== undefined) order.expectedDate = dto.expectedDate ?? null;
      if (dto.currency !== undefined) order.currency = dto.currency.toUpperCase();
      if (dto.shippingTotal !== undefined) order.shippingTotal = dto.shippingTotal;
      if (dto.notes !== undefined) order.notes = this.optional(dto.notes);
      order.updatedBy = userId; this.calculateOrderTotals(order); return this.map(await orderRepo.save(order));
    });
  }

  async send(companyId:string,userId:string,id:string): Promise<PurchaseOrderResponseDto> {
    const order = await this.getEntity(companyId,id); if (order.status !== PurchaseOrderStatus.DRAFT) throw new ConflictException('Only draft purchase orders can be sent'); if (!order.items.length) throw new BadRequestException('Purchase order must contain at least one item'); order.status = PurchaseOrderStatus.SENT; order.updatedBy = userId; return this.map(await this.orderRepository.save(order));
  }

  async cancel(companyId:string,userId:string,id:string): Promise<PurchaseOrderResponseDto> {
    const order = await this.getEntity(companyId,id); if ([PurchaseOrderStatus.RECEIVED,PurchaseOrderStatus.PARTIALLY_RECEIVED].includes(order.status)) throw new ConflictException('A received purchase order cannot be cancelled'); order.status = PurchaseOrderStatus.CANCELLED; order.updatedBy = userId; return this.map(await this.orderRepository.save(order));
  }

  async remove(companyId:string,id:string): Promise<{message:string}> { const order = await this.getEntity(companyId,id); this.ensureEditable(order); await this.orderRepository.softRemove(order); return { message:'Purchase order deleted successfully' }; }

  private async getEntity(companyId:string,id:string): Promise<PurchaseOrderEntity> { const order = await this.orderRepository.findOne({ where:{ id,companyId }, relations:{ items:true } }); if (!order) throw new NotFoundException('Purchase order not found'); return order; }
  private ensureEditable(order:PurchaseOrderEntity): void { if (order.status !== PurchaseOrderStatus.DRAFT) throw new ConflictException('Only draft purchase orders can be edited'); }
  private ensureUniqueItems(ids:string[]): void { if (new Set(ids).size !== ids.length) throw new BadRequestException('Duplicate items are not allowed'); }
  private calculateLine(quantity:number,unitPrice:number,discountPercent:number,taxPercent:number) { const lineSubtotal=this.round(quantity*unitPrice); const discountAmount=this.round(lineSubtotal*(discountPercent/100)); const taxable=this.round(lineSubtotal-discountAmount); const taxAmount=this.round(taxable*(taxPercent/100)); return { lineSubtotal,discountAmount,taxAmount,lineTotal:this.round(taxable+taxAmount) }; }
  private calculateOrderTotals(order:PurchaseOrderEntity): void { order.subtotal=this.round(order.items.reduce((s,i)=>s+Number(i.lineSubtotal),0)); order.discountTotal=this.round(order.items.reduce((s,i)=>s+Number(i.discountAmount),0)); order.taxTotal=this.round(order.items.reduce((s,i)=>s+Number(i.taxAmount),0)); order.shippingTotal=this.round(Number(order.shippingTotal ?? 0)); order.grandTotal=this.round(order.subtotal-order.discountTotal+order.taxTotal+order.shippingTotal); }
  private async generatePoNumber(companyId:string,poDate:string): Promise<string> { const year=new Date(poDate).getUTCFullYear(); const prefix=`PO-${year}-`; const latest=await this.orderRepository.createQueryBuilder('purchaseOrder').withDeleted().select('purchaseOrder.po_number','poNumber').where('purchaseOrder.company_id = :companyId',{companyId}).andWhere('purchaseOrder.po_number LIKE :prefix',{prefix:`${prefix}%`}).orderBy('purchaseOrder.po_number','DESC').getRawOne<{poNumber?:string}>(); const current=latest?.poNumber ? Number(latest.poNumber.replace(prefix,'')) : 0; return `${prefix}${String(current+1).padStart(6,'0')}`; }
  private optional(value?:string): string | null { const v=value?.trim(); return v ? v : null; }
  private round(value:number): number { return Math.round((value+Number.EPSILON)*100)/100; }
  private mapItem(item:PurchaseOrderItemEntity): PurchaseOrderItemResponseDto { return { id:item.id,itemId:item.itemId,description:item.description,quantity:Number(item.quantity),receivedQuantity:Number(item.receivedQuantity),unitPrice:Number(item.unitPrice),discountPercent:Number(item.discountPercent),taxPercent:Number(item.taxPercent),lineSubtotal:Number(item.lineSubtotal),discountAmount:Number(item.discountAmount),taxAmount:Number(item.taxAmount),lineTotal:Number(item.lineTotal) }; }
  private map(order:PurchaseOrderEntity): PurchaseOrderResponseDto { return { id:order.id,companyId:order.companyId,supplierId:order.supplierId,warehouseId:order.warehouseId,poNumber:order.poNumber,poDate:order.poDate,expectedDate:order.expectedDate,status:order.status,currency:order.currency,subtotal:Number(order.subtotal),discountTotal:Number(order.discountTotal),taxTotal:Number(order.taxTotal),shippingTotal:Number(order.shippingTotal),grandTotal:Number(order.grandTotal),notes:order.notes,items:(order.items ?? []).map((item)=>this.mapItem(item)),createdAt:order.createdAt,updatedAt:order.updatedAt,deletedAt:order.deletedAt }; }
}
