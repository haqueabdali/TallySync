import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { FixedAssetEntity } from '../asset-management/entities/fixed-asset.entity';
import { DepreciationEntryEntity } from '../depreciation/entities/depreciation-entry.entity';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { AssetDisposalController } from './asset-disposal.controller';
import { AssetDisposalService } from './asset-disposal.service';
import { AssetDisposalEntity } from './entities/asset-disposal.entity';
@Module({ imports: [TypeOrmModule.forFeature([AssetDisposalEntity, FixedAssetEntity, DepreciationEntryEntity, AccountEntity]), JournalEntriesModule], controllers: [AssetDisposalController], providers: [AssetDisposalService], exports: [AssetDisposalService] })
export class AssetDisposalModule {}
