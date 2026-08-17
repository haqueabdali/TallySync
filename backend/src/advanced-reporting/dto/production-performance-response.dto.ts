import { ApiProperty } from '@nestjs/swagger';

export class ProductionPerformanceResponseDto {
  @ApiProperty() dateFrom!: string;
  @ApiProperty() dateTo!: string;

  @ApiProperty() totalSchedules!: number;
  @ApiProperty() planned!: number;
  @ApiProperty() scheduled!: number;
  @ApiProperty() inProgress!: number;
  @ApiProperty() completed!: number;
  @ApiProperty() cancelled!: number;

  @ApiProperty() completedOnTime!: number;
  @ApiProperty() completedLate!: number;
  @ApiProperty() completionRatePercent!: number;
  @ApiProperty() onTimeCompletionPercent!: number;

  @ApiProperty() totalPlannedMinutes!: number;
  @ApiProperty() totalActualMinutes!: number;
  @ApiProperty() averageActualMinutes!: number;
}
