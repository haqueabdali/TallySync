import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { LicenseHeartbeatDto } from './dto/license-heartbeat.dto';
import { LicensingService } from './licensing.service';

@ApiTags('License Runtime')
@Controller('license-runtime')
export class LicenseRuntimeController {
  constructor(private readonly licensingService: LicensingService) {}

  @Post('heartbeat')
  @ApiOperation({
    summary:
      'Validate an authorized installation and refresh its license heartbeat',
  })
  heartbeat(
    @Body() dto: LicenseHeartbeatDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.licensingService.heartbeat(dto, {
      ipAddress,
      userAgent: userAgent ?? null,
    });
  }
}
