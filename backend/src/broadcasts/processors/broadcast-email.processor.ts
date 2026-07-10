import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BROADCAST_EMAIL_QUEUE,
  BROADCAST_FANOUT_JOB,
  BROADCAST_SEND_JOB,
} from '../broadcasts.constants';
import {
  BroadcastsService,
  type BroadcastSendJobData,
} from '../broadcasts.service';

@Processor(BROADCAST_EMAIL_QUEUE)
export class BroadcastEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastEmailProcessor.name);

  constructor(private readonly broadcasts: BroadcastsService) {
    super();
  }

  async process(job: Job) {
    if (job.name === BROADCAST_FANOUT_JOB) {
      const broadcastId = job.data?.broadcastId as string | undefined;
      if (!broadcastId) return;
      await this.broadcasts.fanOut(broadcastId);
      this.logger.log(`Fan-out complete for broadcast ${broadcastId}`);
      return { broadcastId };
    }

    if (job.name === BROADCAST_SEND_JOB) {
      const data = job.data as BroadcastSendJobData;
      await this.broadcasts.sendRecipient(data);
      return data;
    }
  }
}
