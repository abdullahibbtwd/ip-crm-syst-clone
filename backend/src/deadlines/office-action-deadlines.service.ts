import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterTimelineEventType,
  Prisma,
} from '../../generated/prisma/client';
import { filingAuthorityForJurisdiction } from '../matters/ip-right-filing.utils';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from './deadlines.utils';

function formatDeadlineDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function deadlineTitle(
  ruleDescription: string | null,
  jurisdiction: string,
): string {
  if (ruleDescription?.trim()) return ruleDescription.trim();
  const authority = filingAuthorityForJurisdiction(jurisdiction);
  return `${authority} office action response`;
}

@Injectable()
export class OfficeActionDeadlinesService {
  constructor(private readonly prisma: PrismaService) {}

  async generateFromOfficeAction(
    matterId: string,
    correspondenceId: string,
    receivedDate: Date,
    userId: string,
  ) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      include: { jurisdictions: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const assigneeId = matter.assignedToId ?? matter.filedById;
    if (!assigneeId) {
      return {
        matterId,
        correspondenceId,
        created: 0,
        skipped: 'no_assignee' as const,
      };
    }

    const jurisdictions =
      matter.jurisdictions.length > 0
        ? matter.jurisdictions.map((j) => j.countryCode.toUpperCase())
        : [];

    if (jurisdictions.length === 0) {
      return {
        matterId,
        correspondenceId,
        created: 0,
        skipped: 'no_jurisdictions' as const,
      };
    }

    const baseDate = new Date(receivedDate);
    let created = 0;
    let superseded = 0;
    const createdDeadlineIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const jurisdiction of jurisdictions) {
        const rules = await tx.deadlineRule.findMany({
          where: {
            jurisdiction,
            matterType: matter.matterType,
            triggerType: DeadlineRuleTriggerType.office_action,
          },
        });

        for (const rule of rules) {
          const existingForCorrespondence = await tx.deadline.findFirst({
            where: {
              sourceCorrespondenceId: correspondenceId,
              ruleId: rule.id,
            },
          });
          if (existingForCorrespondence) continue;

          const supersedeResult = await tx.deadline.updateMany({
            where: {
              matterId,
              ruleId: rule.id,
              status: DeadlineStatus.pending,
            },
            data: { status: DeadlineStatus.superseded },
          });
          superseded += supersedeResult.count;

          const dueDate = addDays(
            baseDate,
            rule.daysOffset,
            rule.isBusinessDays,
          );
          const graceDate =
            rule.gracePeriodDays > 0
              ? addDays(dueDate, rule.gracePeriodDays, rule.isBusinessDays)
              : null;

          const title = deadlineTitle(rule.description, jurisdiction);
          const dueLabel = formatDeadlineDate(dueDate);

          const deadline = await tx.deadline.create({
            data: {
              matterId,
              ruleId: rule.id,
              sourceCorrespondenceId: correspondenceId,
              title,
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
              matterId,
              eventType: MatterTimelineEventType.deadline,
              title: `${title} - due ${dueLabel}`,
              description: `Response deadline set from office action received ${formatDeadlineDate(baseDate)}.`,
              occurredAt: new Date(),
              createdById: userId,
              metadata: {
                deadlineId: deadline.id,
                correspondenceId,
                ruleId: rule.id,
                jurisdiction,
                dueDate: dueDate.toISOString(),
                graceDate: graceDate?.toISOString() ?? null,
                supersededCount: supersedeResult.count,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    });

    return {
      matterId,
      correspondenceId,
      created,
      superseded,
      deadlineIds: createdDeadlineIds,
    };
  }
}
