import {
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  tallyGroup?: string | null;
}