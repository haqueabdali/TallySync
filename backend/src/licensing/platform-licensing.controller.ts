import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
<<<<<<< HEAD
import { CommercialNotificationsService } from './commercial-notifications.service';
import { CreateLicenseActivationDto } from './dto/create-license-activation.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { ListCommercialNotificationsQueryDto } from './dto/list-commercial-notifications-query.dto';
import { ListLicenseAuditQueryDto } from './dto/list-license-audit-query.dto';
import { ListLicensesQueryDto } from './dto/list-licenses-query.dto';
import { ReplaceLicenseFeaturesDto } from './dto/replace-license-features.dto';
import { RenewLicenseDto } from './dto/renew-license.dto';
=======
import { CreateLicenseActivationDto } from './dto/create-license-activation.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { ListLicensesQueryDto } from './dto/list-licenses-query.dto';
import { ReplaceLicenseFeaturesDto } from './dto/replace-license-features.dto';
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
import { UpdateLicenseDto } from './dto/update-license.dto';
import { PlatformAdminGuard } from './guards/platform-admin.guard';
import { LicensingService } from './licensing.service';
import { LicenseSessionService } from './license-session.service';

@ApiTags('Platform Licensing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
@Controller('platform/licenses')
export class PlatformLicensingController {
  constructor(
    private readonly licensingService: LicensingService,
    private readonly licenseSessionService: LicenseSessionService,
<<<<<<< HEAD
    private readonly commercialNotificationsService: CommercialNotificationsService,
=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Super Admin licensing dashboard summary' })
  dashboard() {
    return this.licensingService.dashboard();
  }

<<<<<<< HEAD
  @Get('plan-templates')
  @ApiOperation({ summary: 'List commercial license plan templates' })
  planTemplates() {
    return this.licensingService.planTemplates();
  }

=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
  @Get()
  @ApiOperation({ summary: 'List company licenses for Super Admin' })
  list(@Query() query: ListLicensesQueryDto) {
    return this.licensingService.list(query);
  }

<<<<<<< HEAD

  @Get('notifications')
  @ApiOperation({ summary: 'List cross-company commercial notifications' })
  commercialNotifications(@Query() query: ListCommercialNotificationsQueryDto) {
    return this.commercialNotificationsService.listForPlatform(query);
  }

  @Post('notifications/scan-expirations')
  @ApiOperation({ summary: 'Generate idempotent customer license-expiration reminders' })
  scanExpirationNotifications() {
    return this.commercialNotificationsService.scanExpirationReminders();
  }

  @Get('audit')
  @ApiOperation({ summary: 'List platform commercial audit history' })
  audit(@Query() query: ListLicenseAuditQueryDto) {
    return this.licensingService.listAuditLogs(query);
  }

=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
  @Get(':id/usage')
  @ApiOperation({ summary: 'Get company license user and activation usage' })
  async usage(@Param('id', ParseUUIDPipe) id: string) {
    const base = await this.licensingService.usage(id);
    const sessionUsage = await this.licenseSessionService.usageForLicense(id);
    const maxConcurrentUsers = base.maxConcurrentUsers;

    return {
      ...base,
      ...sessionUsage,
      remainingConcurrentUsers:
        maxConcurrentUsers === null
          ? null
          : Math.max(0, maxConcurrentUsers - sessionUsage.concurrentUsers),
      concurrentUtilizationPercent:
        maxConcurrentUsers && maxConcurrentUsers > 0
          ? Number(
              (
                (sessionUsage.concurrentUsers / maxConcurrentUsers) *
                100
              ).toFixed(2),
            )
          : null,
    };
  }

  @Get(':id/sessions')
  @ApiOperation({
    summary: 'List recent authentication sessions for a license',
  })
  sessions(@Param('id', ParseUUIDPipe) id: string) {
    return this.licenseSessionService.listForLicense(id);
  }

  @Post(':id/sessions/:sessionId/revoke')
  @ApiOperation({ summary: 'Revoke a company user authentication session' })
  async revokeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    await this.licenseSessionService.revokeForLicense(id, sessionId);
    return { message: 'Authentication session revoked' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a company license' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.licensingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a company license' })
  create(
    @Body() dto: CreateLicenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.create(dto, actor);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update license limits, plan and versions' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLicenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.update(id, dto, actor);
  }

  @Put(':id/features')
  @ApiOperation({ summary: 'Replace enabled modules/features for a company' })
  replaceFeatures(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceLicenseFeaturesDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.replaceFeatures(id, dto, actor);
  }

<<<<<<< HEAD
  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew a company license expiration' })
  renew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenewLicenseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.renew(id, dto, actor);
  }

=======
>>>>>>> 3f291bdc4089472223df9e24763ba2efc0e96500
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a company license' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.activate(id, actor);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend a company license' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.suspend(id, actor);
  }

  @Post(':id/revoke')
  @ApiOperation({ summary: 'Permanently revoke a company license' })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.revoke(id, actor);
  }

  @Post(':id/activations')
  @ApiOperation({ summary: 'Authorize or refresh an installation activation' })
  createActivation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLicenseActivationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.createActivation(id, dto, actor);
  }

  @Post(':id/sign')
  @ApiOperation({
    summary: 'Issue a cryptographically signed license certificate',
  })
  sign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.issueSignedCertificate(id, actor);
  }

  @Post(':id/activations/:activationId/credential')
  @ApiOperation({
    summary:
      'Issue or rotate the secret credential used by an authorized installation heartbeat',
  })
  issueActivationCredential(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activationId', ParseUUIDPipe) activationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.issueActivationCredential(
      id,
      activationId,
      actor,
    );
  }

  @Post(':id/activations/:activationId/revoke')
  @ApiOperation({ summary: 'Revoke an installation activation' })
  revokeActivation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('activationId', ParseUUIDPipe) activationId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.licensingService.revokeActivation(id, activationId, actor);
  }
}
