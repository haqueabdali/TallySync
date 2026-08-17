import { ApiProperty } from '@nestjs/swagger';

export class WorkCenterResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiProperty() dailyCapacityMinutes!: number;
  @ApiProperty() efficiencyPercent!: number;
  @ApiProperty({ type: [Number] }) workingDays!: number[];
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true }) notes!: string | null;
  @ApiProperty({ nullable: true }) createdBy!: string | null;
  @ApiProperty({ nullable: true }) updatedBy!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty({ nullable: true }) deletedAt!: Date | null;
}
