import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FixedAssetEntity } from '../asset-management/entities/fixed-asset.entity';
import { JournalEntriesModule } from '../journal-entries/journal-entries.module';
import { DepreciationController } from './depreciation.controller';
import { DepreciationService } from './depreciation.service';
import { DepreciationEntryEntity } from './entities/depreciation-entry.entity';
import { DepreciationRunEntity } from './entities/depreciation-run.entity';
@Module({ imports: [TypeOrmModule.forFeature([DepreciationRunEntity, DepreciationEntryEntity, FixedAssetEntity]), JournalEntriesModule], controllers: [DepreciationController], providers: [DepreciationService], exports: [DepreciationService] })
export class DepreciationModule {}
