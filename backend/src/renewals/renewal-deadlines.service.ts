import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterTimelineEventType,
  Prisma,
} from '../../generated/prisma/client';
import { filingAuthorityForJurisdiction } from '../matters/ip-right-filing.utils';
import { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { expandDeadlineRuleJurisdictions } from '../deadlines/deadline-jurisdiction.utils';
import { addDays } from '../deadlines/deadlines.utils';

function formatDeadlineDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function renewalDeadlineTitle(
  ruleDescription: string | null,
  jurisdiction: string,
): string {
  if (ruleDescription?.trim()) return ruleDescription.trim();
  const authority = filingAuthorityForJurisdiction(jurisdiction);
  return `${authority} renewal due`;
}

@Injectable()
export class RenewalDeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deadlineNotify: DeadlineNotifyService,
  ) {}

  async generateFromWindow(renewalWindowId: string, userId: string) {
    const window = await this.prisma.renewalWindow.findUnique({
      where: { id: renewalWindowId },
      include: {
        ipRight: true,
        matter: {
          select: {
            id: true,
            matterType: true,
            assignedToId: true,
            filedById: true,
          },
        },
      },
    });
    if (!window) throw new NotFoundException('Renewal window not found');

    const assigneeId = window.matter.assignedToId ?? window.matter.filedById;
    if (!assigneeId) {
      return {
        renewalWindowId,
        matterId: window.matterId,
        created: 0,
        updated: 0,
        skipped: 'no_assignee' as const,
      };
    }

    const jurisdictions = expandDeadlineRuleJurisdictions(
      [window.jurisdiction],
      window.matter.matterType,
    );

    if (jurisdictions.length === 0) {
      return {
        renewalWindowId,
        matterId: window.matterId,
        created: 0,
        updated: 0,
        skipped: 'no_jurisdictions' as const,
      };
    }

    const baseDate = new Date(window.dueDate);
    let created = 0;
    let updated = 0;
    const createdDeadlineIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const jurisdiction of jurisdictions) {
        const rules = await tx.deadlineRule.findMany({
          where: {
            jurisdiction,
            matterType: window.matter.matterType,
            triggerType: DeadlineRuleTriggerType.renewal_due,
          },
        });

        for (const rule of rules) {
          const dueDate = addDays(
            baseDate,
            rule.daysOffset,
            rule.isBusinessDays,
          );
          const graceDate =
            rule.gracePeriodDays > 0
              ? addDays(dueDate, rule.gracePeriodDays, rule.isBusinessDays)
              : window.graceDate;

          const title = renewalDeadlineTitle(rule.description, jurisdiction);
          const dueLabel = formatDeadlineDate(dueDate);

          const existing = await tx.deadline.findFirst({
            where: {
              matterId: window.matterId,
              ruleId: rule.id,
              sourceRenewalWindowId: renewalWindowId,
            },
          });

          if (existing) {
            if (
              (
                [
                  DeadlineStatus.pending,
                  DeadlineStatus.in_progress,
                  DeadlineStatus.missed,
                  DeadlineStatus.escalated,
                ] as DeadlineStatus[]
              ).includes(existing.status)
            ) {
              await tx.deadline.update({
                where: { id: existing.id },
                data: {
                  dueDate,
                  graceDate,
                  title,
                  assignedToId: assigneeId,
                },
              });
              updated += 1;
            }
            continue;
          }

          const deadline = await tx.deadline.create({
            data: {
              matterId: window.matterId,
              ruleId: rule.id,
              sourceRenewalWindowId: renewalWindowId,
              title,
              jurisdiction,
              dueDate,
              graceDate,
              assignedToId: assigneeId,
              status: DeadlineStatus.pending,
            },
          });
          createdDeadlineIds.push(deadline.id);
          created += 1;

          await tx.matterTimelineEvent.create({
            data: {
              matterId: window.matterId,
              eventType: MatterTimelineEventType.deadline,
              title: `${title} - due ${dueLabel}`,
              description: `Renewal deadline set for cycle ${window.cycleNumber} (due ${formatDeadlineDate(baseDate)}).`,
              occurredAt: new Date(),
              createdById: userId,
              metadata: {
                deadlineId: deadline.id,
                renewalWindowId,
                ipRightId: window.ipRightId,
                ruleId: rule.id,
                jurisdiction,
                cycleNumber: window.cycleNumber,
                dueDate: dueDate.toISOString(),
                graceDate: graceDate?.toISOString() ?? null,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    });

    for (const deadlineId of createdDeadlineIds) {
      void this.deadlineNotify
        .notifyAssigned(deadlineId)
        .catch(() => undefined);
    }

    return {
      renewalWindowId,
      matterId: window.matterId,
      created,
      updated,
      deadlineIds: createdDeadlineIds,
    };
  }
}
