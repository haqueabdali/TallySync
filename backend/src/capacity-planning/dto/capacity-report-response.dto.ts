import { ApiProperty } from '@nestjs/swagger';

export class CapacityDayDto {
  @ApiProperty() date!: string;
  @ApiProperty() nominalMinutes!: number;
  @ApiProperty() effectiveCapacityMinutes!: number;
  @ApiProperty() scheduledMinutes!: number;
  @ApiProperty() availableMinutes!: number;
  @ApiProperty() utilizationPercent!: number;
  @ApiProperty() overloadMinutes!: number;
  @ApiProperty() isBottleneck!: boolean;
}

export class WorkCenterCapacityDto {
  @ApiProperty() workCenterId!: string;
  @ApiProperty() workCenterCode!: string;
  @ApiProperty() workCenterName!: string;
  @ApiProperty({ type: CapacityDayDto, isArray: true })
  days!: CapacityDayDto[];
  @ApiProperty() totalCapacityMinutes!: number;
  @ApiProperty() totalScheduledMinutes!: number;
  @ApiProperty() utilizationPercent!: number;
  @ApiProperty() bottleneckDays!: number;
}

export class CapacityReportResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty({ type: WorkCenterCapacityDto, isArray: true })
  workCenters!: WorkCenterCapacityDto[];
  @ApiProperty() totalCapacityMinutes!: number;
  @ApiProperty() totalScheduledMinutes!: number;
  @ApiProperty() utilizationPercent!: number;
  @ApiProperty() bottleneckWorkCenters!: number;
}
