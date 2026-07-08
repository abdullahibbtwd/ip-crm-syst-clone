import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { ReportsService } from '../reports/reports.service';
import { RenewalsService } from '../renewals/renewals.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  renewalUrgency,
  type RenewalUrgencyTier,
} from '../reports/renewal-urgency.util';

type AlertKind = 'deadline' | 'renewal' | 'notification' | 'watch';
type AlertSeverity = 'overdue' | 'today' | 'urgent' | 'notification';

export type AlertItem = {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  subtitle?: string;
  linkUrl: string;
  occurredAt: string;
  unread?: boolean;
  notificationId?: string;
};

function clientDisplayName(client: {
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  internalCode: string | null;
}): string {
  if (client.companyName) return client.companyName;
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return name || client.internalCode || 'Client';
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, days: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function dedupeById(items: AlertItem[]) {
  const byId = new Map<string, AlertItem>();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly reports: ReportsService,
    private readonly renewals: RenewalsService,
    private readonly notifications: NotificationsService,
  ) {}

  async getSummary(user: AuthenticatedUser) {
    const now = new Date();
    const today = startOfDay(now);
    const withinDays = 7;
    const dueWithin = addDays(today, withinDays);

    const roles = new Set(user.roles);
    const isFirmWide =
      roles.has(SYSTEM_ROLES.MANAGING_PARTNER) ||
      roles.has(SYSTEM_ROLES.COORDINATOR) ||
      roles.has(SYSTEM_ROLES.DOCKETING_ADMIN);

    const canReadDeadlines = user.permissions.includes('deadline:read');
    const canReadRenewals = user.permissions.includes('renewal:read');

    const deadlineRiskQuery = {
      dueWithinDays: withinDays,
      ...(isFirmWide
        ? {}
        : roles.has(SYSTEM_ROLES.PORTAL_CLIENT)
          ? { clientId: user.clientId ?? undefined }
          : { assignedToId: user.userId }),
    };

    const [deadlineRisk, notifications, renewalsWorklist] = await Promise.all([
      canReadDeadlines
        ? this.reports.getDeadlineRisk(deadlineRiskQuery)
        : Promise.resolve({ groups: [] }),
      this.notifications.listForUser(user.userId, 50),
      canReadRenewals
        ? isFirmWide || roles.has(SYSTEM_ROLES.COORDINATOR)
          ? this.renewals.listAll({
              limit: 50,
              dueBefore: dueWithin.toISOString(),
            })
          : roles.has(SYSTEM_ROLES.PORTAL_CLIENT)
            ? this.renewals.listForPortalClient(user.clientId ?? '')
            : this.renewals.listMy(
                user,
                {
                  limit: 50,
                  dueBefore: dueWithin.toISOString(),
                },
              )
        : Promise.resolve({ items: [] as unknown[] }),
    ]);

    const overdue: AlertItem[] = [];
    const todayItems: AlertItem[] = [];
    const urgent: AlertItem[] = [];

    // Deadlines (overdue/today/urgent) from reports "deadline-risk"
    for (const clientBucket of deadlineRisk.groups ?? []) {
      const clientName = clientDisplayName(clientBucket.client);
      for (const jurisdictionBucket of clientBucket.jurisdictions ?? []) {
        const jurisdiction = jurisdictionBucket.jurisdiction;
        for (const assigneeBucket of jurisdictionBucket.assignees ?? []) {
          for (const dl of assigneeBucket.deadlines ?? []) {
            const tier = dl.urgency as AlertSeverity;
            if (tier !== 'overdue' && tier !== 'today' && tier !== 'urgent') continue;

            const item: AlertItem = {
              id: `deadline:${dl.id}`,
              kind: 'deadline',
              severity: tier,
              title: dl.title,
              subtitle: `${dl.matterTitle} · ${jurisdiction} · ${clientName}`,
              linkUrl: `/matters/${dl.matterId}/deadlines`,
              occurredAt: dl.dueDate,
            };

            if (tier === 'overdue') overdue.push(item);
            if (tier === 'today') todayItems.push(item);
            if (tier === 'urgent') urgent.push(item);
          }
        }
      }
    }

    // Renewals (overdue/today/urgent) from renewals worklist
    if (canReadRenewals) {
      const rows = Array.isArray(renewalsWorklist)
        ? renewalsWorklist
        : (renewalsWorklist as { items?: Array<any> }).items ?? [];
      for (const row of rows) {
        const dueDate = new Date(row.dueDate);
        const tier = renewalUrgency(dueDate, row.status as any) as RenewalUrgencyTier;
        if (tier !== 'overdue' && tier !== 'today' && tier !== 'urgent') continue;

        const alert: AlertItem = {
          id: `renewal:${row.id}`,
          kind: 'renewal',
          severity: tier,
          title: row.ipRight?.title ?? 'Renewal',
          subtitle: `${row.matter?.title ?? ''}`.trim() || undefined,
          linkUrl: `/matters/${row.matterId}/ip-rights`,
          occurredAt: new Date(row.dueDate).toISOString(),
        };

        if (tier === 'overdue') overdue.push(alert);
        if (tier === 'today') todayItems.push(alert);
        if (tier === 'urgent') urgent.push(alert);
      }
    }

    // Notifications (neutral section)
    const unreadNotifications = (notifications?.items ?? []).filter((n) => n.readAt == null);
    const notificationsItems: AlertItem[] = unreadNotifications.map((n) => ({
      id: `notification:${n.id}`,
      kind: 'notification',
      severity: 'notification',
      title: n.title,
      subtitle: n.body ?? undefined,
      linkUrl: n.linkUrl ?? '/dashboard',
      occurredAt: new Date(n.createdAt).toISOString(),
      unread: true,
      notificationId: n.id,
    }));

    const byOccurredAsc = (a: AlertItem, b: AlertItem) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
    const byOccurredDesc = (a: AlertItem, b: AlertItem) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

    overdue.sort(byOccurredAsc);
    todayItems.sort(byOccurredAsc);
    urgent.sort(byOccurredAsc);
    notificationsItems.sort(byOccurredDesc);

    const overdueDedupe = dedupeById(overdue);
    const todayDedupe = dedupeById(todayItems);
    const urgentDedupe = dedupeById(urgent);
    const notificationsDedupe = dedupeById(notificationsItems);

    const maxPerSection = 20;

    return {
      generatedAt: now.toISOString(),
      overdue: overdueDedupe.slice(0, maxPerSection),
      today: todayDedupe.slice(0, maxPerSection),
      urgent: urgentDedupe.slice(0, maxPerSection),
      notifications: notificationsDedupe.slice(0, maxPerSection),
      watch: [],
    };
  }
}

