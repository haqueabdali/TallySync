import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
export class UpdateWarehouseStatusDto { @ApiProperty() @IsBoolean() isActive!: boolean; }
