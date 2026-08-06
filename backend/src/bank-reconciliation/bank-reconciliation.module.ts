import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountEntity } from '../accounts/entities/account.entity';
import { JournalEntryLineEntity } from '../journal-entries/entities/journal-entry-line.entity';
import { JournalEntryEntity } from '../journal-entries/entities/journal-entry.entity';
import { BankReconciliationController } from './bank-reconciliation.controller';
import { BankReconciliationService } from './bank-reconciliation.service';
import { BankReconciliationEntity } from './entities/bank-reconciliation.entity';
import { BankReconciliationMatchEntity } from './entities/bank-reconciliation-match.entity';
import { BankStatementLineEntity } from './entities/bank-statement-line.entity';
@Module({ imports: [TypeOrmModule.forFeature([BankReconciliationEntity, BankStatementLineEntity, BankReconciliationMatchEntity, AccountEntity, JournalEntryEntity, JournalEntryLineEntity])], controllers: [BankReconciliationController], providers: [BankReconciliationService], exports: [BankReconciliationService] })
export class BankReconciliationModule {}
