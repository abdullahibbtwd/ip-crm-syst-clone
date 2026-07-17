import { PrismaService } from '../prisma/prisma.service';
import { SEND_EMAIL_JOB } from './notifications.constants';
import { NotificationDispatchService } from './notification-dispatch.service';
import type { NotificationsGateway } from './notifications.gateway';
import type { ManagingPartnerAudienceService } from './managing-partner-audience.service';

describe('NotificationDispatchService', () => {
  let service: NotificationDispatchService;
  let prisma: {
    notification: {
      create: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
    };
  };
  let gateway: { emitToUser: jest.Mock };
  let managingPartnerAudience: { listActiveManagingPartners: jest.Mock };
  let emailQueue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({
          id: 'n1',
          type: 'deadline_reminder',
          title: 'Hello',
          body: 'Body',
          resource: 'deadline',
          resourceId: 'd1',
          linkUrl: '/x',
          readAt: null,
          createdAt: new Date(),
        }),
        count: jest.fn().mockResolvedValue(2),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    gateway = { emitToUser: jest.fn() };
    managingPartnerAudience = {
      listActiveManagingPartners: jest.fn().mockResolvedValue([]),
    };
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new NotificationDispatchService(
      prisma as unknown as PrismaService,
      gateway as unknown as NotificationsGateway,
      managingPartnerAudience as unknown as ManagingPartnerAudienceService,
      emailQueue as never,
    );
  });

  it('dispatch creates, emits websocket events, and queues email', async () => {
    await service.dispatch({
      userId: 'u1',
      type: 'deadline_reminder',
      title: 'Hello',
      body: 'Body',
      resource: 'deadline',
      resourceId: 'd1',
      linkUrl: '/x',
      emailTo: 'a@x.com',
      emailSubject: 'Subj',
    });

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'u1',
      'notification',
      expect.objectContaining({ id: 'n1', unread: true }),
    );
    expect(gateway.emitToUser).toHaveBeenCalledWith('u1', 'unread_count', {
      count: 2,
    });
    expect(emailQueue.add).toHaveBeenCalledWith(
      SEND_EMAIL_JOB,
      expect.objectContaining({
        to: 'a@x.com',
        subject: 'Subj',
        notificationId: 'n1',
      }),
    );
  });

  it('skips email when sendEmail is false', async () => {
    await service.dispatch({
      userId: 'u1',
      type: 'deadline_reminder',
      title: 'Hello',
      emailTo: 'a@x.com',
      sendEmail: false,
    });
    expect(emailQueue.add).not.toHaveBeenCalled();
  });

  it('dispatchDeadline fans out to managing partners', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'mp1', email: 'mp@x.com' },
    ]);

    await service.dispatchDeadline({
      userId: 'u1',
      assigneeName: 'Ada',
      type: 'deadline_reminder',
      title: 'Due',
      body: 'Body',
      resource: 'deadline',
      resourceId: 'd1',
      emailTo: 'a@x.com',
      emailSubject: 'Due today',
      metadata: { milestone: 'due_today' },
    });

    // assignee + MP
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(emailQueue.add).toHaveBeenCalledWith(
      SEND_EMAIL_JOB,
      expect.objectContaining({
        to: 'mp@x.com',
        subject: '[Firm] Due today',
      }),
    );
  });

  it('skips MP copy when one already exists', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'mp1', email: 'mp@x.com' },
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

    await service.ensureManagingPartnerDeadlineCopies({
      userId: 'u1',
      type: 'deadline_reminder',
      title: 'Due',
      resource: 'deadline',
      resourceId: 'd1',
      metadata: { milestone: 'due_today' },
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('returns zero when no managing partners exist', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([]);
    await expect(
      service.ensureManagingPartnerDeadlineCopies({
        userId: 'u1',
        type: 'deadline_reminder',
        title: 'Due',
        resourceId: 'd1',
      }),
    ).resolves.toBe(0);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('skips MP fan-out when assignee is the only managing partner', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'u1', email: 'mp@x.com' },
    ]);
    await expect(
      service.ensureManagingPartnerDeadlineCopies({
        userId: 'u1',
        type: 'deadline_reminder',
        title: 'Due',
        resourceId: 'd1',
      }),
    ).resolves.toBe(0);
  });

  it('includes assignee name in MP body when provided', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'mp1', email: 'mp@x.com' },
    ]);

    await service.ensureManagingPartnerDeadlineCopies({
      userId: 'u1',
      assigneeName: 'Ada',
      type: 'deadline_reminder',
      title: 'Due',
      body: 'Reply due',
      resourceId: 'd1',
      metadata: { source: 'scan' },
    });

    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          body: 'Reply due Attorney: Ada.',
        }),
      }),
    );
  });

  it('dedupes MP copies by source metadata when milestone absent', async () => {
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'mp1', email: 'mp@x.com' },
    ]);
    prisma.notification.findFirst.mockResolvedValue({ id: 'existing' });

    await service.ensureManagingPartnerDeadlineCopies({
      userId: 'u1',
      type: 'deadline_reminder',
      title: 'Due',
      resourceId: 'd1',
      metadata: { source: 'backfill' },
    });

    expect(prisma.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              metadata: { path: ['source'], equals: 'backfill' },
            }),
          ]),
        }),
      }),
    );
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('uses default email subject when emailSubject omitted', async () => {
    await service.dispatch({
      userId: 'u1',
      type: 'deadline_reminder',
      title: 'Hello',
      emailTo: 'a@x.com',
    });
    expect(emailQueue.add).toHaveBeenCalledWith(
      SEND_EMAIL_JOB,
      expect.objectContaining({ subject: 'Hello', text: 'Hello' }),
    );
  });
});
