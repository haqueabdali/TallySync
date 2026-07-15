import {
  IsString,
  Length,
} from 'class-validator';

export class RejectSalesOrderDto {
  @IsString()
  @Length(2, 1000)
  reason: string;
}