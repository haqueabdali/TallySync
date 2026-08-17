import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateWorkCenterDto {
  @ApiProperty({ example: 'WC-ASSEMBLY-01' })
  @IsString()
  @MaxLength(100)
  code!: string;

  @ApiProperty({ example: 'Main Assembly Line' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    description: 'Nominal minutes available per working day',
    example: 480,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  dailyCapacityMinutes!: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 200,
    default: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(200)
  efficiencyPercent?: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 3, 4, 5],
    description: 'UTC weekday numbers, Sunday=0 through Saturday=6',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
