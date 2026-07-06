import { Injectable, Logger } from '@nestjs/common';
import { DeadlineStatus, Prisma } from '../../generated/prisma/client';
import { ACTIVE_DEADLINE_STATUSES } from '../deadlines/deadlines.constants';
import { PrismaService } from '../prisma/prisma.service';
import {
  daysUntilDue,
  DEADLINE_REMINDER_MILESTONES,
  isEligibleForMilestone,
  MAX_DAYS_AFTER_REMINDER,
  MAX_DAYS_BEFORE_REMINDER,
  milestoneMatches,
  OVERDUE_CATCHUP_MILESTONE,
  parseRemindersSent,
  reminderBody,
  reminderEmailSubject,
  reminderTitle,
  startOfDay,
} from './deadline-reminder.utils';
import {
  NotificationDispatchService,
  type DispatchDeadlineNotificationInput,
} from './notification-dispatch.service';

const deadlineInclude = {
  assignedTo: { select: { id: true, fullName: true, email: true } },
  matter: { select: { id: true, title: true } },
} as const;

type DeadlineWithRelations = Prisma.DeadlineGetPayload<{
  include: typeof deadlineInclude;
}>;

function formatDate(date: Date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

@Injectable()
export class DeadlineNotificationScanService {
  private readonly logger = new Logger(DeadlineNotificationScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatch: NotificationDispatchService,
  ) {}

  async run() {
    const now = new Date();
    const today = startOfDay(now);

    const scanFrom = new Date(today);
    scanFrom.setDate(scanFrom.getDate() - MAX_DAYS_AFTER_REMINDER);

    const scanTo = new Date(today);
    scanTo.setDate(scanTo.getDate() + MAX_DAYS_BEFORE_REMINDER);
    scanTo.setHours(23, 59, 59, 999);

    let remindersSent = 0;
    let escalated = 0;

    const candidates = await this.prisma.deadline.findMany({
      where: {
        status: { notIn: [DeadlineStatus.completed, DeadlineStatus.superseded] },
        dueDate: { gte: scanFrom, lte: scanTo },
      },
      include: deadlineInclude,
    });

    for (const deadline of candidates) {
      const daysUntil = daysUntilDue(deadline.dueDate, today);
      const sent = new Set(parseRemindersSent(deadline.remindersSent));
      const dueLabel = formatDate(deadline.dueDate);
      let updatedSent: string[] | null = null;

      for (const milestone of DEADLINE_REMINDER_MILESTONES) {
        if (sent.has(milestone.key)) continue;
        if (!isEligibleForMilestone(deadline.status, milestone)) continue;
        if (!milestoneMatches(milestone, daysUntil)) continue;

        await this.dispatch.dispatchDeadline({
          userId: deadline.assignedToId,
          assigneeName: deadline.assignedTo.fullName,
          type: 'deadline_reminder',
          title: reminderTitle(milestone, deadline.title),
          body: reminderBody(milestone, deadline.matter.title, dueLabel),
          resource: 'deadline',
          resourceId: deadline.id,
          linkUrl: `/matters/${deadline.matterId}/deadlines`,
          emailTo: deadline.assignedTo.email,
          emailSubject: reminderEmailSubject(
            milestone,
            deadline.title,
            dueLabel,
          ),
          metadata: {
            matterId: deadline.matterId,
            dueDate: deadline.dueDate.toISOString(),
            milestone: milestone.key,
            daysUntilDue: daysUntil,
          },
        });

        sent.add(milestone.key);
        updatedSent = [...sent];
        remindersSent += 1;
      }

      if (updatedSent) {
        await this.prisma.deadline.update({
          where: { id: deadline.id },
          data: {
            remindersSent: updatedSent,
            reminderSentAt: now,
          },
        });
      }
    }

    const afterMilestone = DEADLINE_REMINDER_MILESTONES.find(
      (m) => m.key === 'after_3',
    )!;

    const overdueCatchup = await this.prisma.deadline.findMany({
      where: {
        status: { notIn: [DeadlineStatus.completed, DeadlineStatus.superseded] },
        dueDate: { lt: today },
      },
      include: deadlineInclude,
    });

    for (const deadline of overdueCatchup) {
      const sent = new Set(parseRemindersSent(deadline.remindersSent));
      if (sent.has('after_3') || sent.has(OVERDUE_CATCHUP_MILESTONE)) continue;
      if (!isEligibleForMilestone(deadline.status, afterMilestone)) continue;

      const daysUntil = daysUntilDue(deadline.dueDate, today);
      const dueLabel = formatDate(deadline.dueDate);

      await this.dispatch.dispatchDeadline({
        userId: deadline.assignedToId,
        assigneeName: deadline.assignedTo.fullName,
        type: 'deadline_reminder',
        title: `Deadline overdue: ${deadline.title}`,
        body: `${deadline.matter.title} was due ${dueLabel} and is still open.`,
        resource: 'deadline',
        resourceId: deadline.id,
        linkUrl: `/matters/${deadline.matterId}/deadlines`,
        emailTo: deadline.assignedTo.email,
        emailSubject: `Overdue: ${deadline.title} (${dueLabel})`,
        metadata: {
          matterId: deadline.matterId,
          dueDate: deadline.dueDate.toISOString(),
          milestone: OVERDUE_CATCHUP_MILESTONE,
          daysUntilDue: daysUntil,
        },
      });

      await this.prisma.deadline.update({
        where: { id: deadline.id },
        data: {
          remindersSent: [...sent, OVERDUE_CATCHUP_MILESTONE],
          reminderSentAt: now,
        },
      });
      remindersSent += 1;
    }

    const overdue = await this.prisma.deadline.findMany({
      where: {
        status: { in: [...ACTIVE_DEADLINE_STATUSES] },
        dueDate: { lt: today },
      },
      include: deadlineInclude,
    });

    for (const deadline of overdue) {
      const threshold = startOfDay(deadline.graceDate ?? deadline.dueDate);
      if (threshold >= today) continue;

      await this.prisma.deadline.update({
        where: { id: deadline.id },
        data: {
          status: DeadlineStatus.escalated,
          escalationLevel: deadline.escalationLevel + 1,
        },
      });

      const dueLabel = formatDate(deadline.dueDate);
      await this.dispatch.dispatchDeadline({
        userId: deadline.assignedToId,
        assigneeName: deadline.assignedTo.fullName,
        type: 'deadline_escalation',
        title: `Overdue deadline: ${deadline.title}`,
        body: `${deadline.matter.title} was due ${dueLabel} and has been escalated.`,
        resource: 'deadline',
        resourceId: deadline.id,
        linkUrl: `/matters/${deadline.matterId}/deadlines`,
        emailTo: deadline.assignedTo.email,
        emailSubject: `Escalation: ${deadline.title} is overdue`,
        metadata: {
          matterId: deadline.matterId,
          dueDate: deadline.dueDate.toISOString(),
          escalationLevel: deadline.escalationLevel + 1,
        },
      });
      escalated += 1;
    }

    this.logger.log(`Scan: ${remindersSent} reminders, ${escalated} escalations`);

    const mpBackfill = await this.backfillManagingPartnerCopies(
      [...candidates, ...overdueCatchup],
      today,
    );
    if (mpBackfill > 0) {
      this.logger.log(`MP backfill: ${mpBackfill} managing-partner copies`);
    }

    return { remindersSent, escalated, mpBackfill };
  }

  /**
   * Assignee reminders are deduped on the deadline row; MPs may have missed copies
   * if fan-out was added after milestones were already sent. Reconcile idempotently.
   */
  private async backfillManagingPartnerCopies(
    deadlines: DeadlineWithRelations[],
    today: Date,
  ) {
    let copies = 0;

    for (const deadline of deadlines) {
      const sent = new Set(parseRemindersSent(deadline.remindersSent));
      const daysUntil = daysUntilDue(deadline.dueDate, today);
      const dueLabel = formatDate(deadline.dueDate);
      const base = this.deadlineDispatchBase(deadline);

      for (const milestone of DEADLINE_REMINDER_MILESTONES) {
        if (!sent.has(milestone.key)) continue;
        if (!isEligibleForMilestone(deadline.status, milestone)) continue;

        copies += await this.dispatch.ensureManagingPartnerDeadlineCopies({
          ...base,
          type: 'deadline_reminder',
          title: reminderTitle(milestone, deadline.title),
          body: reminderBody(milestone, deadline.matter.title, dueLabel),
          emailSubject: reminderEmailSubject(
            milestone,
            deadline.title,
            dueLabel,
          ),
          metadata: {
            matterId: deadline.matterId,
            dueDate: deadline.dueDate.toISOString(),
            milestone: milestone.key,
            daysUntilDue: daysUntil,
          },
        });
      }

      if (sent.has(OVERDUE_CATCHUP_MILESTONE)) {
        copies += await this.dispatch.ensureManagingPartnerDeadlineCopies({
          ...base,
          type: 'deadline_reminder',
          title: `Deadline overdue: ${deadline.title}`,
          body: `${deadline.matter.title} was due ${dueLabel} and is still open.`,
          emailSubject: `Overdue: ${deadline.title} (${dueLabel})`,
          metadata: {
            matterId: deadline.matterId,
            dueDate: deadline.dueDate.toISOString(),
            milestone: OVERDUE_CATCHUP_MILESTONE,
            daysUntilDue: daysUntil,
          },
        });
      }

      if (deadline.status === DeadlineStatus.escalated) {
        copies += await this.dispatch.ensureManagingPartnerDeadlineCopies({
          ...base,
          type: 'deadline_escalation',
          title: `Overdue deadline: ${deadline.title}`,
          body: `${deadline.matter.title} was due ${dueLabel} and has been escalated.`,
          emailSubject: `Escalation: ${deadline.title} is overdue`,
          metadata: {
            matterId: deadline.matterId,
            dueDate: deadline.dueDate.toISOString(),
            escalationLevel: deadline.escalationLevel,
          },
        });
      }
    }

    return copies;
  }

  private deadlineDispatchBase(
    deadline: DeadlineWithRelations,
  ): Pick<
    DispatchDeadlineNotificationInput,
    'userId' | 'assigneeName' | 'resource' | 'resourceId' | 'linkUrl' | 'emailTo'
  > {
    return {
      userId: deadline.assignedToId,
      assigneeName: deadline.assignedTo.fullName,
      resource: 'deadline',
      resourceId: deadline.id,
      linkUrl: `/matters/${deadline.matterId}/deadlines`,
      emailTo: deadline.assignedTo.email,
    };
  }
}
