import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductionOrderStatus } from '../enums/production-order-status.enum';

export class ProductionOrderComponentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() componentItemId!: string;
  @ApiProperty() componentItemName!: string;
  @ApiPropertyOptional({ nullable: true }) componentItemSku!: string | null;
  @ApiProperty() bomQuantity!: number;
  @ApiProperty() scrapPercentage!: number;
  @ApiProperty() requiredQuantity!: number;
  @ApiProperty() consumedQuantity!: number;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}

export class ProductionOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() orderNumber!: string;
  @ApiProperty() billOfMaterialId!: string;
  @ApiProperty() billOfMaterialCode!: string;
  @ApiProperty() finishedItemId!: string;
  @ApiProperty() finishedItemName!: string;
  @ApiPropertyOptional({ nullable: true }) finishedItemSku!: string | null;
  @ApiProperty() warehouseId!: string;
  @ApiProperty() warehouseName!: string;
  @ApiProperty({ enum: ProductionOrderStatus }) status!: ProductionOrderStatus;
  @ApiProperty() plannedQuantity!: number;
  @ApiProperty() completedQuantity!: number;
  @ApiPropertyOptional({ nullable: true }) plannedStartDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) plannedEndDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) actualStartDate!: Date | null;
  @ApiPropertyOptional({ nullable: true }) actualEndDate!: Date | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty({ type: [ProductionOrderComponentResponseDto] }) components!: ProductionOrderComponentResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedProductionOrdersResponseDto {
  @ApiProperty({ type: [ProductionOrderResponseDto] }) data!: ProductionOrderResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
