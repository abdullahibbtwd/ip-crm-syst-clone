import type { Job } from 'bullmq';
import { ACCOUNTING_SYNC_JOB } from '../accounting-sync.constants';
import type { AccountingSyncService } from '../accounting-sync.service';
import { AccountingSyncProcessor } from './accounting-sync.processor';

describe('AccountingSyncProcessor', () => {
  const sync = { syncProvider: jest.fn() };
  const processor = new AccountingSyncProcessor(
    sync as unknown as AccountingSyncService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unexpected job names', async () => {
    await processor.process({ name: 'other', data: {} } as Job);
    expect(sync.syncProvider).not.toHaveBeenCalled();
  });

  it('syncs the requested provider', async () => {
    sync.syncProvider.mockResolvedValue({
      provider: 'xero',
      attempted: 1,
      succeeded: 1,
      failed: 0,
    });

    await processor.process({
      name: ACCOUNTING_SYNC_JOB,
      data: { provider: 'xero', actorUserId: 'u1' },
    } as Job);

    expect(sync.syncProvider).toHaveBeenCalledWith('xero', 'u1');
  });
});
