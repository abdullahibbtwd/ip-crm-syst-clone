import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ACTIVE_DEADLINE_STATUSES } from '../../deadlines/deadlines.constants';
import { DeadlineNotificationScanService } from '../deadline-notification-scan.service';
import {
  DEADLINE_SCAN_JOB,
  DEADLINE_SCAN_QUEUE,
} from '../notifications.constants';

@Processor(DEADLINE_SCAN_QUEUE)
export class DeadlineScanProcessor extends WorkerHost {
  private readonly logger = new Logger(DeadlineScanProcessor.name);

  constructor(private readonly scan: DeadlineNotificationScanService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== DEADLINE_SCAN_JOB) return;
    const result = await this.scan.run();
    this.logger.log(
      `Deadline scan complete: ${result.remindersSent} reminders, ${result.escalated} escalations`,
    );
    return result;
  }
}
