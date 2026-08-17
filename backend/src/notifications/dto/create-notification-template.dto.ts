import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { NotificationChannel } from '../enums/notification-channel.enum';

export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'invoice.overdue' })
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional({ example: 'Invoice {{invoiceNumber}} is overdue' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subjectTemplate?: string;

  @ApiProperty({ example: 'Invoice {{invoiceNumber}} has an outstanding balance of {{balance}}.' })
  @IsString()
  bodyTemplate!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
