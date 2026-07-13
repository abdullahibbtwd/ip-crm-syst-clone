import { Injectable, Logger } from '@nestjs/common';
import { ContactRole, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';

const alertNotifyInclude = {
  watchProfile: {
    select: {
      id: true,
      markText: true,
      createdById: true,
      createdBy: { select: { id: true, email: true } },
    },
  },
  client: {
    select: {
      id: true,
      assignedUserId: true,
      assignedUser: { select: { id: true, email: true } },
      contacts: {
        where: { isActive: true, email: { not: null } },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
        },
        orderBy: [{ role: 'asc' as const }, { createdAt: 'asc' as const }],
      },
    },
  },
} satisfies Prisma.WatchAlertInclude;

type AlertNotifyRow = Prisma.WatchAlertGetPayload<{
  include: typeof alertNotifyInclude;
}>;

@Injectable()
export class WatchAlertNotifyService {
  private readonly logger = new Logger(WatchAlertNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
    private readonly email: EmailService,
  ) {}

  async notifyAlertCreated(alertId: string) {
    const alert = await this.loadAlert(alertId);
    if (!alert) return;

    const title = `Watch alert: ${alert.conflictingMark}`;
    const body = `Potential conflict "${alert.conflictingMark}" matched watched mark "${alert.watchProfile.markText}" (status: ${alert.status}).`;
    const linkUrl = `/watch-alerts/${alert.id}`;

    await this.dispatchToRecipients(alert, {
      type: 'watch_alert_created',
      title,
      body,
      linkUrl,
    });

    await this.emailCrmContact(alert, title, body);
  }

  async notifyAlertTriaged(
    alertId: string,
    decision: 'accepted' | 'rejected',
  ) {
    const alert = await this.loadAlert(alertId);
    if (!alert) return;

    const title = `Watch alert ${decision}: ${alert.conflictingMark}`;
    const body = `Conflict "${alert.conflictingMark}" vs watched mark "${alert.watchProfile.markText}" was ${decision}.`;
    const linkUrl = `/watch-alerts/${alert.id}`;

    await this.dispatchToRecipients(alert, {
      type: 'watch_alert_triaged',
      title,
      body,
      linkUrl,
      metadata: { decision },
    });

    await this.emailCrmContact(alert, title, body);
  }

  private async loadAlert(alertId: string): Promise<AlertNotifyRow | null> {
    return this.prisma.watchAlert.findUnique({
      where: { id: alertId },
      include: alertNotifyInclude,
    });
  }

  private async dispatchToRecipients(
    alert: AlertNotifyRow,
    input: {
      type: 'watch_alert_created' | 'watch_alert_triaged';
      title: string;
      body: string;
      linkUrl: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const emailByUserId = new Map<string, string | undefined>();

    const addRecipient = (userId: string | null | undefined, email?: string) => {
      if (!userId) return;
      if (!emailByUserId.has(userId)) {
        emailByUserId.set(userId, email);
      } else if (email && !emailByUserId.get(userId)) {
        emailByUserId.set(userId, email);
      }
    };

    addRecipient(
      alert.watchProfile.createdById,
      alert.watchProfile.createdBy?.email,
    );
    addRecipient(alert.client.assignedUserId, alert.client.assignedUser?.email);

    const partners =
      await this.managingPartnerAudience.listActiveManagingPartners();
    for (const partner of partners) {
      addRecipient(partner.id, partner.email);
    }

    const portalUsers = await this.prisma.user.findMany({
      where: { clientId: alert.clientId, isActive: true },
      select: { id: true, email: true },
    });
    for (const user of portalUsers) {
      addRecipient(user.id, user.email);
    }

    for (const [userId, emailTo] of emailByUserId) {
      await this.notifications.dispatch({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        resource: 'watch_alert',
        resourceId: alert.id,
        linkUrl: input.linkUrl,
        emailTo: emailTo ?? undefined,
        metadata: {
          watchAlertId: alert.id,
          clientId: alert.clientId,
          watchProfileId: alert.watchProfileId,
          conflictingMark: alert.conflictingMark,
          watchedMark: alert.watchProfile.markText,
          status: alert.status,
          ...input.metadata,
        },
      });
    }
  }

  private async emailCrmContact(
    alert: AlertNotifyRow,
    subject: string,
    text: string,
  ) {
    const contacts = alert.client.contacts.filter((c) => Boolean(c.email));
    const primary = contacts.find((c) => c.role === ContactRole.primary);
    const target = primary ?? contacts[0];
    if (!target?.email) return;

    try {
      await this.email.send({
        to: target.email,
        subject,
        text,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to email CRM contact ${target.email} for watch alert ${alert.id}: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }
  }
}
