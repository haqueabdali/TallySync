import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ApproveSalesOrderDto {
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  notes?: string;
}