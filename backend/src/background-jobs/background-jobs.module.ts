import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BackgroundJobsController } from './background-jobs.controller';
import { BackgroundJobsService } from './background-jobs.service';
import { BackgroundJobsWorker } from './background-jobs.worker';
import { BackgroundJobEntity } from './entities/background-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BackgroundJobEntity])],
  controllers: [BackgroundJobsController],
  providers: [BackgroundJobsService, BackgroundJobsWorker],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}
