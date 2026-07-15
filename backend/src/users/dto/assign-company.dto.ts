import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignCompanyDto {
  @IsUUID('4', { message: 'companyId must be a valid UUID' })
  @IsNotEmpty()
  companyId: string;
}
