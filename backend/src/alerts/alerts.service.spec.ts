import type { AuthenticatedUser } from '../auth/auth.types';
import { RenewalStatus } from '../../generated/prisma/client';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { AlertsService } from './alerts.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { RenewalsService } from '../renewals/renewals.service';
import type { ReportsService } from '../reports/reports.service';

describe('AlertsService', () => {
  const reports = { getDeadlineRisk: jest.fn() };
  const renewals = {
    listAll: jest.fn(),
    listMy: jest.fn(),
    listForPortalClient: jest.fn(),
  };
  const notifications = { listForUser: jest.fn() };

  let service: AlertsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AlertsService(
      reports as unknown as ReportsService,
      renewals as unknown as RenewalsService,
      notifications as unknown as NotificationsService,
    );
    reports.getDeadlineRisk.mockResolvedValue({ groups: [] });
    renewals.listAll.mockResolvedValue({ items: [] });
    renewals.listMy.mockResolvedValue({ items: [] });
    renewals.listForPortalClient.mockResolvedValue([]);
    notifications.listForUser.mockResolvedValue({ items: [] });
  });

  it('getSummary delegates to firm-wide renewals and deadline risk', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['deadline:read', 'renewal:read'],
    } as AuthenticatedUser;

    await service.getSummary(user);

    expect(reports.getDeadlineRisk).toHaveBeenCalledWith(
      expect.objectContaining({ dueWithinDays: 7 }),
    );
    expect(renewals.listAll).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 }),
    );
    expect(notifications.listForUser).toHaveBeenCalledWith('u1', 50);
    expect(renewals.listMy).not.toHaveBeenCalled();
  });

  it('getSummary uses listMy for assigned attorney', async () => {
    const user = {
      userId: 'u2',
      roles: [SYSTEM_ROLES.IP_ATTORNEY],
      permissions: ['deadline:read', 'renewal:read'],
    } as AuthenticatedUser;

    await service.getSummary(user);

    expect(reports.getDeadlineRisk).toHaveBeenCalledWith(
      expect.objectContaining({ assignedToId: 'u2' }),
    );
    expect(renewals.listMy).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ limit: 50 }),
    );
    expect(renewals.listAll).not.toHaveBeenCalled();
  });

  it('getSummary uses portal client scope', async () => {
    const user = {
      userId: 'u3',
      clientId: 'c1',
      roles: [SYSTEM_ROLES.PORTAL_CLIENT],
      permissions: ['deadline:read', 'renewal:read'],
    } as AuthenticatedUser;

    await service.getSummary(user);

    expect(reports.getDeadlineRisk).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'c1' }),
    );
    expect(renewals.listForPortalClient).toHaveBeenCalledWith('c1');
  });

  it('getSummary skips deadline and renewal fetches without permissions', async () => {
    const user = {
      userId: 'u4',
      roles: [SYSTEM_ROLES.IP_ATTORNEY],
      permissions: [],
    } as AuthenticatedUser;

    const result = await service.getSummary(user);

    expect(reports.getDeadlineRisk).not.toHaveBeenCalled();
    expect(renewals.listAll).not.toHaveBeenCalled();
    expect(renewals.listMy).not.toHaveBeenCalled();
    expect(notifications.listForUser).toHaveBeenCalledWith('u4', 50);
    expect(result).toEqual(
      expect.objectContaining({
        overdue: [],
        today: [],
        urgent: [],
        notifications: [],
        watch: [],
      }),
    );
  });

  it('getSummary uses coordinator firm-wide renewals', async () => {
    const user = {
      userId: 'u5',
      roles: [SYSTEM_ROLES.COORDINATOR],
      permissions: ['deadline:read', 'renewal:read'],
    } as AuthenticatedUser;

    await service.getSummary(user);

    expect(renewals.listAll).toHaveBeenCalled();
    expect(renewals.listMy).not.toHaveBeenCalled();
  });

  it('maps deadline risk into overdue/today/urgent buckets', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['deadline:read'],
    } as AuthenticatedUser;

    reports.getDeadlineRisk.mockResolvedValue({
      groups: [
        {
          client: {
            type: 'company',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
          },
          jurisdictions: [
            {
              jurisdiction: 'EP',
              assignees: [
                {
                  deadlines: [
                    {
                      id: 'd1',
                      title: 'Reply',
                      matterTitle: 'Matter A',
                      matterId: 'm1',
                      dueDate: '2026-01-01',
                      urgency: 'overdue',
                    },
                    {
                      id: 'd2',
                      title: 'Fee',
                      matterTitle: 'Matter B',
                      matterId: 'm2',
                      dueDate: '2026-07-17',
                      urgency: 'today',
                    },
                    {
                      id: 'd3',
                      title: 'Renew',
                      matterTitle: 'Matter C',
                      matterId: 'm3',
                      dueDate: '2026-07-20',
                      urgency: 'urgent',
                    },
                    {
                      id: 'd4',
                      title: 'Later',
                      matterTitle: 'Matter D',
                      matterId: 'm4',
                      dueDate: '2026-08-01',
                      urgency: 'soon',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await service.getSummary(user);

    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0].id).toBe('deadline:d1');
    expect(result.today).toHaveLength(1);
    expect(result.urgent).toHaveLength(1);
  });

  it('maps renewals and unread notifications', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['renewal:read'],
    } as AuthenticatedUser;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    renewals.listAll.mockResolvedValue({
      items: [
        {
          id: 'r1',
          dueDate: yesterday.toISOString(),
          status: RenewalStatus.upcoming,
          matterId: 'm1',
          ipRight: { title: 'TM Mark' },
          matter: { title: 'Matter X' },
        },
      ],
    });
    notifications.listForUser.mockResolvedValue({
      items: [
        {
          id: 'n1',
          title: 'New filing',
          body: 'Check inbox',
          linkUrl: '/inbox',
          createdAt: new Date().toISOString(),
          readAt: null,
        },
        {
          id: 'n2',
          title: 'Read notice',
          createdAt: new Date().toISOString(),
          readAt: new Date().toISOString(),
        },
      ],
    });

    const result = await service.getSummary(user);

    expect(result.overdue.some((a) => a.id === 'renewal:r1')).toBe(true);
    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].notificationId).toBe('n1');
  });

  it('dedupes alerts by id within each section', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['deadline:read'],
    } as AuthenticatedUser;

    reports.getDeadlineRisk.mockResolvedValue({
      groups: [
        {
          client: {
            type: 'company',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
          },
          jurisdictions: [
            {
              jurisdiction: 'EP',
              assignees: [
                {
                  deadlines: [
                    {
                      id: 'd1',
                      title: 'Reply',
                      matterTitle: 'Matter A',
                      matterId: 'm1',
                      dueDate: '2026-01-01',
                      urgency: 'overdue',
                    },
                    {
                      id: 'd1',
                      title: 'Reply duplicate',
                      matterTitle: 'Matter A',
                      matterId: 'm1',
                      dueDate: '2026-01-01',
                      urgency: 'overdue',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await service.getSummary(user);
    expect(result.overdue).toHaveLength(1);
  });

  it('getSummary uses firm-wide renewals for docketing admin', async () => {
    const user = {
      userId: 'u6',
      roles: [SYSTEM_ROLES.DOCKETING_ADMIN],
      permissions: ['deadline:read', 'renewal:read'],
    } as AuthenticatedUser;

    await service.getSummary(user);

    expect(renewals.listAll).toHaveBeenCalled();
    expect(renewals.listMy).not.toHaveBeenCalled();
  });

  it('uses individual client name and internalCode fallback in subtitles', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['deadline:read'],
    } as AuthenticatedUser;

    reports.getDeadlineRisk.mockResolvedValue({
      groups: [
        {
          client: {
            type: 'individual',
            companyName: null,
            firstName: 'Jane',
            lastName: 'Doe',
            internalCode: 'CL-9',
          },
          jurisdictions: [
            {
              jurisdiction: 'EU',
              assignees: [
                {
                  deadlines: [
                    {
                      id: 'd1',
                      title: 'Reply',
                      matterTitle: 'Matter A',
                      matterId: 'm1',
                      dueDate: '2026-01-01',
                      urgency: 'overdue',
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          client: {
            type: 'individual',
            companyName: null,
            firstName: null,
            lastName: null,
            internalCode: 'CL-ANON',
          },
          jurisdictions: [
            {
              jurisdiction: 'BG',
              assignees: [
                {
                  deadlines: [
                    {
                      id: 'd2',
                      title: 'Fee',
                      matterTitle: 'Matter B',
                      matterId: 'm2',
                      dueDate: '2026-07-17',
                      urgency: 'today',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const result = await service.getSummary(user);
    expect(result.overdue[0].subtitle).toContain('Jane Doe');
    expect(result.today[0].subtitle).toContain('CL-ANON');
  });

  it('maps renewal today and urgent tiers', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['renewal:read'],
    } as AuthenticatedUser;

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const urgent = new Date(today);
    urgent.setDate(urgent.getDate() + 3);

    renewals.listAll.mockResolvedValue({
      items: [
        {
          id: 'r-today',
          dueDate: today.toISOString(),
          status: RenewalStatus.upcoming,
          matterId: 'm1',
          ipRight: { title: 'Mark Today' },
          matter: { title: 'Matter T' },
        },
        {
          id: 'r-urgent',
          dueDate: urgent.toISOString(),
          status: RenewalStatus.upcoming,
          matterId: 'm2',
          ipRight: null,
          matter: { title: 'Matter U' },
        },
      ],
    });

    const result = await service.getSummary(user);
    expect(result.today.some((a) => a.id === 'renewal:r-today')).toBe(true);
    expect(result.urgent.some((a) => a.id === 'renewal:r-urgent')).toBe(true);
    expect(result.urgent.find((a) => a.id === 'renewal:r-urgent')?.title).toBe(
      'Renewal',
    );
  });

  it('caps each section at 20 items', async () => {
    const user = {
      userId: 'u1',
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      permissions: ['deadline:read'],
    } as AuthenticatedUser;

    const deadlines = Array.from({ length: 25 }, (_, i) => ({
      id: `d${i}`,
      title: `DL ${i}`,
      matterTitle: 'Matter',
      matterId: 'm1',
      dueDate: '2026-01-01',
      urgency: 'overdue' as const,
    }));

    reports.getDeadlineRisk.mockResolvedValue({
      groups: [
        {
          client: {
            type: 'company',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
            internalCode: 'CL-1',
          },
          jurisdictions: [
            {
              jurisdiction: 'EU',
              assignees: [{ deadlines }],
            },
          ],
        },
      ],
    });

    const result = await service.getSummary(user);
    expect(result.overdue).toHaveLength(20);
  });
});
