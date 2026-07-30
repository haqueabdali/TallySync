import { ApiProperty } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  supplierCode!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  companyName!: string | null;

  @ApiProperty({ required: false, nullable: true })
  contactPerson!: string | null;

  @ApiProperty({ required: false, nullable: true })
  email!: string | null;

  @ApiProperty({ required: false, nullable: true })
  phone!: string | null;

  @ApiProperty({ required: false, nullable: true })
  mobile!: string | null;

  @ApiProperty({ required: false, nullable: true })
  taxNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  vatNumber!: string | null;

  @ApiProperty({ required: false, nullable: true })
  billingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  shippingAddress!: string | null;

  @ApiProperty({ required: false, nullable: true })
  city!: string | null;

  @ApiProperty({ required: false, nullable: true })
  state!: string | null;

  @ApiProperty({ required: false, nullable: true })
  postalCode!: string | null;

  @ApiProperty({ required: false, nullable: true })
  country!: string | null;

  @ApiProperty()
  creditLimit!: number;

  @ApiProperty()
  openingBalance!: number;

  @ApiProperty()
  currentBalance!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  paymentTerms!: number;

  @ApiProperty({ required: false, nullable: true })
  notes!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ required: false, nullable: true })
  deletedAt!: Date | null;
}

export class SupplierPaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  hasNextPage!: boolean;

  @ApiProperty()
  hasPreviousPage!: boolean;
}

export class PaginatedSuppliersResponseDto {
  @ApiProperty({
    type: SupplierResponseDto,
    isArray: true,
  })
  data!: SupplierResponseDto[];

  @ApiProperty({
    type: SupplierPaginationMetaDto,
  })
  meta!: SupplierPaginationMetaDto;
}