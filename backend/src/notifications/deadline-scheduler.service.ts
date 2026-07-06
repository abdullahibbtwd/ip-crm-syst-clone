import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  DEADLINE_SCAN_JOB,
  DEADLINE_SCAN_QUEUE,
} from './notifications.constants';

@Injectable()
export class DeadlineSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DeadlineSchedulerService.name);

  constructor(
    @InjectQueue(DEADLINE_SCAN_QUEUE) private readonly scanQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const pattern =
      this.config.get('DEADLINE_SCAN_CRON') ?? '0 2 * * *';

    await this.scanQueue.add(
      DEADLINE_SCAN_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'deadline-nightly-scan',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled deadline scan job (${pattern})`);

    if (
      this.config.get('DEADLINE_SCAN_ON_STARTUP') === 'true' ||
      this.config.get('NODE_ENV') !== 'production'
    ) {
      await this.scanQueue.add(DEADLINE_SCAN_JOB, {}, { jobId: `startup-${Date.now()}` });
      this.logger.log('Queued initial deadline scan on startup');
    }
  }
}
