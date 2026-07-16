import type { Request } from 'express';
import { UnlinkedEmailStatus } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { EmailQueueController } from './email-queue.controller';
import type { UnlinkedEmailService } from './unlinked-email.service';

describe('EmailQueueController', () => {
  const queue = {
    listQueue: jest.fn(),
    getStats: jest.fn(),
    getPreview: jest.fn(),
    getDownloadUrl: jest.fn(),
    getById: jest.fn(),
    linkToMatter: jest.fn(),
    dismiss: jest.fn(),
  };

  const controller = new EmailQueueController(
    queue as unknown as UnlinkedEmailService,
  );

  const user = {
    userId: 'u1',
    roles: ['coordinator'],
  } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('forwards list, stats, and read endpoints', async () => {
    await controller.list({ status: UnlinkedEmailStatus.pending });
    await controller.stats();
    await controller.preview('ue1');
    await controller.download('ue1');
    await controller.getOne('ue1');

    expect(queue.listQueue).toHaveBeenCalledWith(UnlinkedEmailStatus.pending);
    expect(queue.getStats).toHaveBeenCalled();
    expect(queue.getPreview).toHaveBeenCalledWith('ue1');
    expect(queue.getDownloadUrl).toHaveBeenCalledWith('ue1');
    expect(queue.getById).toHaveBeenCalledWith('ue1');
  });

  it('defaults list status to pending', async () => {
    await controller.list({});
    expect(queue.listQueue).toHaveBeenCalledWith(UnlinkedEmailStatus.pending);
  });

  it('forwards link and dismiss with actor context', async () => {
    await controller.link(
      'ue1',
      { matterId: 'm1', category: 'correspondence' } as never,
      req,
    );
    await controller.dismiss('ue1', req);

    expect(queue.linkToMatter).toHaveBeenCalledWith(
      'ue1',
      'm1',
      'u1',
      user.roles,
      'correspondence',
    );
    expect(queue.dismiss).toHaveBeenCalledWith('ue1', 'u1', user.roles);
  });
});
