import { ApiProperty } from '@nestjs/swagger';

export class PostingLineResponseDto {
  @ApiProperty()
  accountId!: string;

  @ApiProperty()
  debit!: number;

  @ApiProperty()
  credit!: number;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty({ required: false, nullable: true })
  partyType!: string | null;

  @ApiProperty({ required: false, nullable: true })
  partyId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  costCenter!: string | null;
}
