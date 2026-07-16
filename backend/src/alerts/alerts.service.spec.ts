import type { AuthenticatedUser } from '../auth/auth.types';
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

  const service = new AlertsService(
    reports as unknown as ReportsService,
    renewals as unknown as RenewalsService,
    notifications as unknown as NotificationsService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
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
});
