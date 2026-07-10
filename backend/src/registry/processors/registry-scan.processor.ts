import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  REGISTRY_SCAN_JOB,
  REGISTRY_SCAN_QUEUE,
} from '../registry.constants';
import { RegistryScanService } from '../registry-scan.service';

@Processor(REGISTRY_SCAN_QUEUE)
export class RegistryScanProcessor extends WorkerHost {
  private readonly logger = new Logger(RegistryScanProcessor.name);

  constructor(private readonly scan: RegistryScanService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== REGISTRY_SCAN_JOB) return;
    const result = await this.scan.scanEpoWatchProfiles();
    this.logger.log(
      `Registry scan job done: scanned=${result.profilesScanned} created=${result.alertsCreated} errors=${result.errors}`,
    );
    return result;
  }
}
