import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { NotificationChannel } from '../enums/notification-channel.enum';

export class CreateNotificationDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiProperty({ description: 'Email, phone number, webhook URL, or user ID for in-app delivery' })
  @IsString()
  @MaxLength(500)
  recipient!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @ApiProperty()
  @IsString()
  body!: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  availableAt?: string;

}
