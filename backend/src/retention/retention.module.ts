import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RETENTION_SCAN_QUEUE } from './retention.constants';
import { RetentionScanProcessor } from './processors/retention-scan.processor';
import { RetentionSchedulerService } from './retention-scheduler.service';
import { RetentionService } from './retention.service';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({ name: RETENTION_SCAN_QUEUE }),
  ],
  providers: [RetentionService, RetentionSchedulerService, RetentionScanProcessor],
  exports: [RetentionService],
})
export class RetentionModule {}
