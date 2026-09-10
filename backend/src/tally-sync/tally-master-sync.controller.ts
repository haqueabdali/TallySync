import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { TallySingleMasterSyncService } from './tally-single-master-sync.service';

type MasterSyncRequest = {
  user: {
    companyId: string;
  };
};

@ApiTags('Tally Master Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@Controller('tally/masters')
export class TallyMasterSyncController {
  constructor(
    private readonly masterSyncService: TallySingleMasterSyncService,
  ) {}

  @Post('customers/:id/sync')
  @RequireLicenseFeature(LicensedFeature.SALES)
  @ApiOperation({
    summary: 'Synchronize one customer ledger to Tally',
  })
  @ApiOkResponse({
    description: 'Customer ledger synchronized successfully',
  })
  syncCustomer(
    @Req() request: MasterSyncRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.masterSyncService.syncCustomerMaster(
      id,
      request.user.companyId,
    );
  }

  @Post('items/:id/sync')
  @RequireLicenseFeature(LicensedFeature.INVENTORY)
  @ApiOperation({
    summary: 'Synchronize one stock item to Tally',
  })
  @ApiOkResponse({
    description: 'Stock item synchronized successfully',
  })
  syncItem(
    @Req() request: MasterSyncRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.masterSyncService.syncItemMaster(id, request.user.companyId);
  }
}
