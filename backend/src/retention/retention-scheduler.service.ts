import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  RETENTION_SCAN_JOB,
  RETENTION_SCAN_QUEUE,
} from './retention.constants';

@Injectable()
export class RetentionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RetentionSchedulerService.name);

  constructor(
    @InjectQueue(RETENTION_SCAN_QUEUE) private readonly scanQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const pattern =
      this.config.get('RETENTION_SCAN_CRON') ?? '0 3 * * *';

    await this.scanQueue.add(
      RETENTION_SCAN_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'retention-nightly-scan',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled retention scan job (${pattern})`);

    if (this.config.get('RETENTION_SCAN_ON_STARTUP') === 'true') {
      await this.scanQueue.add(RETENTION_SCAN_JOB, {}, { jobId: `retention-startup-${Date.now()}` });
      this.logger.log('Queued initial retention scan on startup');
    }
  }
}
