import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EpoStatusService } from '../epo-status.service';
import {
  EPO_STATUS_SCAN_JOB,
  EPO_STATUS_SCAN_QUEUE,
} from '../registry.constants';

@Processor(EPO_STATUS_SCAN_QUEUE)
export class EpoStatusScanProcessor extends WorkerHost {
  private readonly logger = new Logger(EpoStatusScanProcessor.name);

  constructor(private readonly status: EpoStatusService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== EPO_STATUS_SCAN_JOB) return;
    const result = await this.status.scanAllActiveEpRights();
    this.logger.log(
      `EPO status job done: scanned=${result.rightsScanned} correspondence=${result.correspondenceCreated} errors=${result.errors}`,
    );
    return result;
  }
}
