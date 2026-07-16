import { ContactRole } from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from '../notifications/email.service';
import type { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { WatchAlertNotifyService } from './watch-alert-notify.service';

function alertRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    clientId: 'c1',
    watchProfileId: 'wp1',
    conflictingMark: 'CONFLICT',
    status: 'new',
    watchProfile: {
      id: 'wp1',
      markText: 'WATCHED',
      createdById: 'creator1',
      createdBy: { id: 'creator1', email: 'creator@x.com' },
    },
    client: {
      id: 'c1',
      assignedUserId: 'assign1',
      assignedUser: { id: 'assign1', email: 'assign@x.com' },
      contacts: [
        {
          id: 'ct1',
          email: 'primary@client.com',
          role: ContactRole.primary,
          firstName: 'Pat',
          lastName: 'Lee',
        },
      ],
    },
    ...overrides,
  };
}

describe('WatchAlertNotifyService', () => {
  const prisma = {
    watchAlert: { findUnique: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const notifications = { dispatch: jest.fn() };
  const managingPartnerAudience = { listActiveManagingPartners: jest.fn() };
  const email = { send: jest.fn() };

  const service = new WatchAlertNotifyService(
    prisma as unknown as PrismaService,
    notifications as unknown as NotificationDispatchService,
    managingPartnerAudience as unknown as ManagingPartnerAudienceService,
    email as unknown as EmailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
      { id: 'mp1', email: 'mp@x.com' },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'portal1', email: 'portal@client.com' },
    ]);
    notifications.dispatch.mockResolvedValue(undefined);
    email.send.mockResolvedValue(undefined);
  });

  it('no-ops when alert is missing', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(null);
    await service.notifyAlertCreated('missing');
    expect(notifications.dispatch).not.toHaveBeenCalled();
  });

  it('notifyAlertCreated dispatches to all recipients and emails primary contact', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(alertRow());
    await service.notifyAlertCreated('a1');

    expect(notifications.dispatch).toHaveBeenCalledTimes(4);
    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'creator1',
        type: 'watch_alert_created',
        title: 'Watch alert: CONFLICT',
        resource: 'watch_alert',
        resourceId: 'a1',
      }),
    );
    expect(email.send).toHaveBeenCalledWith({
      to: 'primary@client.com',
      subject: 'Watch alert: CONFLICT',
      text: expect.stringContaining('CONFLICT'),
    });
  });

  it('notifyAlertTriaged includes decision metadata', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(alertRow());
    await service.notifyAlertTriaged('a1', 'accepted');

    expect(notifications.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'watch_alert_triaged',
        title: 'Watch alert accepted: CONFLICT',
        metadata: expect.objectContaining({ decision: 'accepted' }),
      }),
    );
  });

  it('emailCrmContact swallows send failures', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(alertRow());
    email.send.mockRejectedValue(new Error('smtp down'));
    await expect(service.notifyAlertCreated('a1')).resolves.toBeUndefined();
  });

  it('skips CRM email when no contact email exists', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(
      alertRow({
        client: {
          id: 'c1',
          assignedUserId: null,
          assignedUser: null,
          contacts: [],
        },
      }),
    );
    await service.notifyAlertCreated('a1');
    expect(email.send).not.toHaveBeenCalled();
  });
});
