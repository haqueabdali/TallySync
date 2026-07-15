import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

import { UserStatus } from '../../auth/entities/user.entity';

export class CreateUserDto {
  @IsUUID()
  companyId: string;

  @IsUUID()
  roleId: string;

  @IsString()
  @Length(2, 255)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(10, 128)
  @Matches(/[A-Z]/, {
    message: 'Password must contain an uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'Password must contain a lowercase letter',
  })
  @Matches(/[0-9]/, {
    message: 'Password must contain a number',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'Password must contain a special character',
  })
  password: string;

  @IsOptional()
  @IsString()
  @Length(7, 32)
  phone?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}