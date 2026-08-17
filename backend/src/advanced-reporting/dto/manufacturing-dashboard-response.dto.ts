import { ApiProperty } from '@nestjs/swagger';

import { MaintenancePerformanceResponseDto } from './maintenance-performance-response.dto';
import { ProductionPerformanceResponseDto } from './production-performance-response.dto';
import { QualityPerformanceResponseDto } from './quality-performance-response.dto';

export class CapacityDashboardSummaryDto {
  @ApiProperty() totalCapacityMinutes!: number;
  @ApiProperty() totalScheduledMinutes!: number;
  @ApiProperty() utilizationPercent!: number;
  @ApiProperty() bottleneckWorkCenters!: number;
}

export class ManufacturingAlertDto {
  @ApiProperty({
    enum: ['info', 'warning', 'critical'],
  })
  severity!: 'info' | 'warning' | 'critical';

  @ApiProperty() code!: string;
  @ApiProperty() message!: string;
  @ApiProperty() value!: number;
}

export class ManufacturingDashboardResponseDto {
  @ApiProperty() generatedAt!: Date;
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;

  @ApiProperty({
    type: ProductionPerformanceResponseDto,
  })
  production!: ProductionPerformanceResponseDto;

  @ApiProperty({
    type: CapacityDashboardSummaryDto,
  })
  capacity!: CapacityDashboardSummaryDto;

  @ApiProperty({
    type: QualityPerformanceResponseDto,
  })
  quality!: QualityPerformanceResponseDto;

  @ApiProperty({
    type: MaintenancePerformanceResponseDto,
  })
  maintenance!: MaintenancePerformanceResponseDto;

  @ApiProperty({
    type: ManufacturingAlertDto,
    isArray: true,
  })
  alerts!: ManufacturingAlertDto[];
}
