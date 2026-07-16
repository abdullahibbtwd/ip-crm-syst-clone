import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { NotificationsController } from './notifications.controller';
import type { DeadlineNotificationScanService } from './deadline-notification-scan.service';
import type { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  const notifications = {
    listForUser: jest.fn(),
    getUnreadCount: jest.fn(),
    markAllRead: jest.fn(),
    markRead: jest.fn(),
  };
  const deadlineScan = { run: jest.fn() };

  const controller = new NotificationsController(
    notifications as unknown as NotificationsService,
    deadlineScan as unknown as DeadlineNotificationScanService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => {
    jest.clearAllMocks();
    notifications.getUnreadCount.mockResolvedValue(5);
  });

  it('list forwards userId, limit, and cursor', async () => {
    const query = { limit: 20, cursor: 'cur1' };
    await controller.list(query as never, req);
    expect(notifications.listForUser).toHaveBeenCalledWith(
      'u1',
      20,
      'cur1',
    );
  });

  it('unreadCount returns count wrapper', async () => {
    await expect(controller.unreadCount(req)).resolves.toEqual({ count: 5 });
    expect(notifications.getUnreadCount).toHaveBeenCalledWith('u1');
  });

  it('runDeadlineScan delegates to scan service', async () => {
    await controller.runDeadlineScan();
    expect(deadlineScan.run).toHaveBeenCalled();
  });

  it('markAllRead forwards userId', async () => {
    await controller.markAllRead(req);
    expect(notifications.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('markRead forwards userId and id', async () => {
    await controller.markRead('n1', req);
    expect(notifications.markRead).toHaveBeenCalledWith('u1', 'n1');
  });
});
