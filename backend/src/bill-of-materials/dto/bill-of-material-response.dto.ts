import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillOfMaterialStatus } from '../enums/bill-of-material-status.enum';

export class BillOfMaterialComponentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) componentItemId!: string;
  @ApiProperty() componentItemName!: string;
  @ApiPropertyOptional({ nullable: true }) componentItemSku!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() scrapPercentage!: number;
  @ApiProperty() effectiveQuantity!: number;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
}

export class BillOfMaterialResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) companyId!: string;
  @ApiProperty({ format: 'uuid' }) finishedItemId!: string;
  @ApiProperty() finishedItemName!: string;
  @ApiPropertyOptional({ nullable: true }) finishedItemSku!: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() version!: number;
  @ApiProperty() outputQuantity!: number;
  @ApiProperty({ enum: BillOfMaterialStatus }) status!: BillOfMaterialStatus;
  @ApiPropertyOptional({ nullable: true }) effectiveFrom!: string | null;
  @ApiPropertyOptional({ nullable: true }) effectiveTo!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiProperty({ type: [BillOfMaterialComponentResponseDto] }) components!: BillOfMaterialComponentResponseDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class PaginatedBillsOfMaterialResponseDto {
  @ApiProperty({ type: [BillOfMaterialResponseDto] }) data!: BillOfMaterialResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
}
