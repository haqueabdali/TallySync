import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationTemplateDto } from './dto/create-notification-template.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { SendTemplateNotificationDto } from './dto/send-template-notification.dto';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { UpsertNotificationPreferenceDto } from './dto/upsert-notification-preference.dto';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import {
  NotificationsService,
  type NotificationListResult,
} from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post('templates')
  @ApiOperation({ summary: 'Create a notification template' })
  createTemplate(@Req() req: AuthenticatedRequest, @Body() dto: CreateNotificationTemplateDto) {
    return this.service.createTemplate(req.user.companyId, req.user.id, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List notification templates' })
  findTemplates(@Req() req: AuthenticatedRequest) {
    return this.service.findTemplates(req.user.companyId);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update a notification template' })
  updateTemplate(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
    return this.service.updateTemplate(req.user.companyId, req.user.id, id, dto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Soft-delete a notification template' })
  async deleteTemplate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.service.deleteTemplate(req.user.companyId, id);
    return { deleted: true };
  }

  @Get('preferences/me')
  @ApiOperation({ summary: 'Get current user notification preferences' })
  getPreferences(@Req() req: AuthenticatedRequest) {
    return this.service.getPreferences(req.user.companyId, req.user.id);
  }

  @Put('preferences/me')
  @ApiOperation({ summary: 'Create or update a current-user channel preference' })
  upsertPreference(@Req() req: AuthenticatedRequest, @Body() dto: UpsertNotificationPreferenceDto) {
    return this.service.upsertPreference(req.user.companyId, req.user.id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create and queue a notification' })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateNotificationDto) {
    return this.service.create(req.user.companyId, req.user.id, dto);
  }

  @Post('from-template')
  @ApiOperation({ summary: 'Render a template and queue a notification' })
  sendFromTemplate(@Req() req: AuthenticatedRequest, @Body() dto: SendTemplateNotificationDto) {
    return this.service.sendFromTemplate(req.user.companyId, req.user.id, dto);
  }

  @Get()
@ApiOperation({ summary: 'List company notifications' })
findAll(
  @Req() req: AuthenticatedRequest,
  @Query() query: NotificationQueryDto,
): Promise<NotificationListResult> {
  return this.service.findAll(
    req.user.companyId,
    query,
  );
}
  @Get(':id')
  @ApiOperation({ summary: 'Get one notification' })
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.findOne(req.user.companyId, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark an in-app notification as read' })
  markRead(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.markRead(req.user.companyId, req.user.id, id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed notification' })
  retry(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.retry(req.user.companyId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending, queued, or failed notification' })
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.cancel(req.user.companyId, id);
  }
}
