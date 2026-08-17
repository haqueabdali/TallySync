import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceReportResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;
  @ApiProperty() totalAssets!: number;
  @ApiProperty() activeAssets!: number;
  @ApiProperty() openWorkOrders!: number;
  @ApiProperty() completedWorkOrders!: number;
  @ApiProperty() overduePlans!: number;
  @ApiProperty() downtimeMinutes!: number;
  @ApiProperty() maintenanceCost!: number;
}
