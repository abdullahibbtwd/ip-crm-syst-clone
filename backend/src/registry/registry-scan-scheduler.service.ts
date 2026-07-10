import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  REGISTRY_SCAN_JOB,
  REGISTRY_SCAN_QUEUE,
} from './registry.constants';

@Injectable()
export class RegistryScanSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(RegistryScanSchedulerService.name);

  constructor(
    @InjectQueue(REGISTRY_SCAN_QUEUE) private readonly scanQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit() {
    const enabled =
      this.config.get('REGISTRY_SCAN_ENABLED') === 'true' ||
      this.config.get('EPO_WATCH_SCAN_ENABLED') === 'true';

    if (!enabled) {
      this.logger.log(
        'EPO registry watch scan disabled (set REGISTRY_SCAN_ENABLED=true to enable)',
      );
      return;
    }

    const pattern =
      this.config.get('REGISTRY_SCAN_CRON') ??
      this.config.get('EPO_WATCH_SCAN_CRON') ??
      '0 4 * * *';

    await this.scanQueue.add(
      REGISTRY_SCAN_JOB,
      {},
      {
        repeat: { pattern },
        jobId: 'epo-watch-nightly-scan',
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    );

    this.logger.log(`Scheduled EPO watch scan (${pattern})`);

    if (
      this.config.get('REGISTRY_SCAN_ON_STARTUP') === 'true' ||
      this.config.get('EPO_WATCH_SCAN_ON_STARTUP') === 'true'
    ) {
      await this.scanQueue.add(
        REGISTRY_SCAN_JOB,
        {},
        { jobId: `epo-startup-${Date.now()}` },
      );
      this.logger.log('Queued initial EPO watch scan on startup');
    }
  }
}
