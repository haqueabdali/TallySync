import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { NotificationChannel } from '../enums/notification-channel.enum';

export class SendTemplateNotificationDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  templateCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  recipient!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  variables!: Record<string, unknown>;

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
