import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireLicenseFeature } from '../licensing/decorators/require-license-feature.decorator';
import { LicensedFeature } from '../licensing/enums/licensed-feature.enum';
import { LicenseFeatureGuard } from '../licensing/guards/license-feature.guard';
import { CreateFinishedGoodsReceiptDto } from './dto/create-finished-goods-receipt.dto';
import { FinishedGoodsReceiptFilterDto } from './dto/finished-goods-receipt-filter.dto';
import { FinishedGoodsService } from './finished-goods.service';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@ApiTags('Finished Goods')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, LicenseFeatureGuard)
@RequireLicenseFeature(LicensedFeature.MANUFACTURING)
@Controller('finished-goods-receipts')
export class FinishedGoodsController {
  constructor(private readonly service: FinishedGoodsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Finished goods receipt posted.' })
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFinishedGoodsReceiptDto,
  ) {
    return this.service.create(request.user.companyId, request.user.id, dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Paginated finished goods receipts.' })
  findAll(
    @Req() request: AuthenticatedRequest,
    @Query() filter: FinishedGoodsReceiptFilterDto,
  ) {
    return this.service.findAll(request.user.companyId, filter);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Finished goods receipt details.' })
  findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.findOne(request.user.companyId, id);
  }
}
