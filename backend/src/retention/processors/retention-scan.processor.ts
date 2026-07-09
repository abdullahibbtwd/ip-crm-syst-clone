import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  RETENTION_SCAN_JOB,
  RETENTION_SCAN_QUEUE,
} from '../retention.constants';
import { RetentionService } from '../retention.service';

@Processor(RETENTION_SCAN_QUEUE)
export class RetentionScanProcessor extends WorkerHost {
  private readonly logger = new Logger(RetentionScanProcessor.name);

  constructor(private readonly retention: RetentionService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== RETENTION_SCAN_JOB) return;
    const result = await this.retention.runAllRules();
    this.logger.log(
      `Retention scan complete: ${result.recordsAffected} records across ${result.rulesProcessed} rules`,
    );
    return result;
  }
}
