import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { AssetManagementController } from './asset-management.controller';
import { AssetManagementService } from './asset-management.service';
import { AssetCategoryEntity } from './entities/asset-category.entity';
import { FixedAssetEntity } from './entities/fixed-asset.entity';
@Module({ imports: [TypeOrmModule.forFeature([AssetCategoryEntity, FixedAssetEntity, AccountEntity])], controllers: [AssetManagementController], providers: [AssetManagementService], exports: [AssetManagementService] })
export class AssetManagementModule {}
