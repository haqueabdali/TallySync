import { ApiProperty } from '@nestjs/swagger';

export class MaintenancePerformanceResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;

  @ApiProperty() totalAssets!: number;
  @ApiProperty() activeAssets!: number;
  @ApiProperty() outOfServiceAssets!: number;

  @ApiProperty() openWorkOrders!: number;
  @ApiProperty() completedWorkOrders!: number;
  @ApiProperty() emergencyWorkOrders!: number;

  @ApiProperty() downtimeMinutes!: number;
  @ApiProperty() maintenanceCost!: number;
  @ApiProperty() averageMaintenanceCost!: number;
}
