import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RETENTION_SCAN_QUEUE } from './retention.constants';
import { RetentionScanProcessor } from './processors/retention-scan.processor';
import { RetentionRulesController } from './retention-rules.controller';
import { RetentionRulesService } from './retention-rules.service';
import { RetentionSchedulerService } from './retention-scheduler.service';
import { RetentionService } from './retention.service';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({ name: RETENTION_SCAN_QUEUE }),
  ],
  controllers: [RetentionRulesController],
  providers: [
    RetentionService,
    RetentionRulesService,
    RetentionSchedulerService,
    RetentionScanProcessor,
  ],
  exports: [RetentionService, RetentionRulesService],
})
export class RetentionModule {}
