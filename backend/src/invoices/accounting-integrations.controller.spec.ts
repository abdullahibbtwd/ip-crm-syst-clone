import { BadRequestException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AccountingIntegrationsController } from './accounting-integrations.controller';
import type { AccountingSyncService } from './accounting-sync.service';

describe('AccountingIntegrationsController', () => {
  const sync = {
    getProviderStatus: jest.fn(),
    upsertCredentials: jest.fn(),
    clearCredentials: jest.fn(),
  };
  const queue = { add: jest.fn() };

  const controller = new AccountingIntegrationsController(
    sync as unknown as AccountingSyncService,
    queue as unknown as Queue,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue({ id: 'job-1' });
  });

  it('getXero forwards provider', async () => {
    await controller.getXero();
    expect(sync.getProviderStatus).toHaveBeenCalledWith('xero');
  });

  it('upsertXero forwards dto and actor userId', async () => {
    const dto = { clientId: 'id', clientSecret: 'secret' };
    await controller.upsertXero(dto as never, req);
    expect(sync.upsertCredentials).toHaveBeenCalledWith('xero', dto, 'u1');
  });

  it('clearXero forwards provider', async () => {
    await controller.clearXero();
    expect(sync.clearCredentials).toHaveBeenCalledWith('xero');
  });

  it('getQuickBooks forwards provider', async () => {
    await controller.getQuickBooks();
    expect(sync.getProviderStatus).toHaveBeenCalledWith('quickbooks');
  });

  it('upsertQuickBooks forwards dto and actor userId', async () => {
    const dto = { clientId: 'id', clientSecret: 'secret' };
    await controller.upsertQuickBooks(dto as never, req);
    expect(sync.upsertCredentials).toHaveBeenCalledWith(
      'quickbooks',
      dto,
      'u1',
    );
  });

  it('clearQuickBooks forwards provider', async () => {
    await controller.clearQuickBooks();
    expect(sync.clearCredentials).toHaveBeenCalledWith('quickbooks');
  });

  it('enqueueSync queues job for supported provider', async () => {
    const result = await controller.enqueueSync('xero', req);

    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      { provider: 'xero', actorUserId: 'u1' },
      expect.objectContaining({ attempts: 2 }),
    );
    expect(result).toMatchObject({
      queued: true,
      provider: 'xero',
      jobId: 'job-1',
    });
  });

  it('enqueueSync rejects unsupported provider', async () => {
    await expect(controller.enqueueSync('sage', req)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(queue.add).not.toHaveBeenCalled();
  });
});
