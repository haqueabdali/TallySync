import { Controller, Get, Post } from '@nestjs/common';

import { TallySyncService } from './tally-sync.service';

@Controller('tally')
export class TallySyncController {
  constructor(
    private readonly tallySyncService: TallySyncService,
  ) {}

  @Get('status')
  checkConnection() {
    return this.tallySyncService.checkTallyConnection();
  }

  @Post('sync')
  syncPendingSalesOrders() {
    return this.tallySyncService.findPendingSalesOrders();
  }
}