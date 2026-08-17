import { ApiProperty } from '@nestjs/swagger';
import { ProductionSchedulePriority } from '../enums/production-schedule-priority.enum';
import { ProductionScheduleStatus } from '../enums/production-schedule-status.enum';

export class ProductionScheduleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() productionOrderId!: string;
  @ApiProperty() scheduleNumber!: string;
  @ApiProperty() plannedStartAt!: Date;
  @ApiProperty() plannedEndAt!: Date;
  @ApiProperty({ nullable: true }) actualStartAt!: Date | null;
  @ApiProperty({ nullable: true }) actualEndAt!: Date | null;
  @ApiProperty({ enum: ProductionScheduleStatus }) status!: ProductionScheduleStatus;
  @ApiProperty({ enum: ProductionSchedulePriority }) priority!: ProductionSchedulePriority;
  @ApiProperty({ nullable: true }) workCenterCode!: string | null;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty({ nullable: true }) createdBy!: string | null;
  @ApiProperty({ nullable: true }) updatedBy!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ProductionScheduleMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}

export class PaginatedProductionSchedulesResponseDto {
  @ApiProperty({ type: ProductionScheduleResponseDto, isArray: true })
  data!: ProductionScheduleResponseDto[];

  @ApiProperty({ type: ProductionScheduleMetaDto })
  meta!: ProductionScheduleMetaDto;
}
