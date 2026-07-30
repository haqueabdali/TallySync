import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  companyId!: string;

  @ApiProperty({ example: 'ABC Trading SRL' })
  name!: string;

  @ApiProperty({ nullable: true, example: 'accounts@abctrading.it' })
  email!: string | null;

  @ApiProperty({ nullable: true, example: '+39 035 1234567' })
  phone!: string | null;

  @ApiProperty({ nullable: true, example: 'Via Roma 10, Bergamo' })
  address!: string | null;

  @ApiProperty({ nullable: true, example: 'ABC Trading SRL' })
  tallyLedgerName!: string | null;

  @ApiProperty({ example: 5000 })
  creditLimit!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ nullable: true, format: 'date-time' })
  deletedAt!: Date | null;
}

export class PaginatedCustomersResponseDto {
  @ApiProperty({ type: [CustomerResponseDto] })
  data!: CustomerResponseDto[];

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
