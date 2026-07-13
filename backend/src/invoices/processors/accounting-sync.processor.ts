import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import { Job } from 'bullmq'
import { AccountingSyncService } from '../accounting-sync.service'
import {
  ACCOUNTING_SYNC_JOB,
  ACCOUNTING_SYNC_QUEUE,
  type AccountingSyncProvider,
} from '../accounting-sync.constants'

export type AccountingSyncJobData = {
  provider: AccountingSyncProvider
  actorUserId?: string | null
}

@Processor(ACCOUNTING_SYNC_QUEUE, { concurrency: 1 })
export class AccountingSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(AccountingSyncProcessor.name)

  constructor(private readonly sync: AccountingSyncService) {
    super()
  }

  async process(job: Job<AccountingSyncJobData>) {
    if (job.name !== ACCOUNTING_SYNC_JOB) return
    const result = await this.sync.syncProvider(
      job.data.provider,
      job.data.actorUserId,
    )
    this.logger.log(
      `Accounting sync ${result.provider}: attempted=${result.attempted} ok=${result.succeeded} fail=${result.failed}`,
    )
    return result
  }
}
