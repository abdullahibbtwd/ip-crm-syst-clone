import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  EPO_STATUS_SCAN_JOB,
  EPO_STATUS_SCAN_QUEUE,
} from './registry.constants';

@Injectable()
export class EpoStatusSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(EpoStatusSchedulerService.name);

  constructor(
    @InjectQueue(EPO_STATUS_SCAN_QUEUE) private readonly scanQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled = this.config.get('EPO_STATUS_SCAN_ENABLED') === 'true';

    if (!enabled) {
      this.logger.log(
        'EPO prosecution status scan disabled (set EPO_STATUS_SCAN_ENABLED=true to enable)',
      );
      return;
    }

    const pattern = this.config.get('EPO_STATUS_SCAN_CRON') ?? '0 3 * * *';

    await this.scanQueue.add(
      EPO_STATUS_SCAN_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'epo-status-nightly-scan',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled EPO prosecution status scan (${pattern})`);

    if (this.config.get('EPO_STATUS_SCAN_ON_STARTUP') === 'true') {
      await this.scanQueue.add(
        EPO_STATUS_SCAN_JOB,
        {},
        { jobId: `epo-status-startup-${Date.now()}` },
      );
      this.logger.log('Queued initial EPO status scan on startup');
    }
  }
}
