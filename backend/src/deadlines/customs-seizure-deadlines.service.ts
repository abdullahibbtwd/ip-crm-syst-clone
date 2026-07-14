import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterTimelineEventType,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from './deadlines.utils';
import { HolidaysService } from './holidays.service';

function formatDeadlineDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

@Injectable()
export class CustomsSeizureDeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deadlineNotify: DeadlineNotifyService,
    private readonly holidays: HolidaysService,
  ) {}

  async generateFromSeizure(
    matterId: string,
    seizureId: string,
    seizureDate: Date,
    userId: string,
  ) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      include: { jurisdictions: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    if (matter.matterType !== MatterType.border_measures) {
      return { matterId, seizureId, created: 0, skipped: 'wrong_matter_type' as const };
    }

    const assigneeId = matter.assignedToId ?? matter.filedById;
    if (!assigneeId) {
      return { matterId, seizureId, created: 0, skipped: 'no_assignee' as const };
    }

    const matterCodes = matter.jurisdictions.map((j) =>
      j.countryCode.trim().toUpperCase(),
    );

    const rules = await this.prisma.deadlineRule.findMany({
      where: {
        matterType: MatterType.border_measures,
        triggerType: DeadlineRuleTriggerType.customs_seizure,
        isActive: true,
      },
    });

    const applicable =
      matterCodes.length === 0
        ? rules
        : rules.filter(
            (rule) =>
              matterCodes.includes(rule.jurisdiction) ||
              rule.jurisdiction === 'EU' ||
              rule.jurisdiction === 'BG',
          );

    if (applicable.length === 0) {
      return { matterId, seizureId, created: 0, skipped: 'no_rules' as const };
    }

    const baseDate = new Date(seizureDate);
    let created = 0;
    const createdDeadlineIds: string[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const rule of applicable) {
        const existing = await tx.deadline.findFirst({
          where: {
            sourceCustomsSeizureId: seizureId,
            ruleId: rule.id,
          },
        });
        if (existing) continue;

        const holidaySet = await this.holidays.getHolidaySetAround(
          rule.jurisdiction,
          baseDate,
        );

        const supersedeResult = await tx.deadline.updateMany({
          where: {
            matterId,
            ruleId: rule.id,
            status: DeadlineStatus.pending,
          },
          data: { status: DeadlineStatus.superseded },
        });

        const dueDate = addDays(
          baseDate,
          rule.daysOffset,
          rule.isBusinessDays,
          holidaySet,
        );
        const graceDate =
          rule.gracePeriodDays > 0
            ? addDays(
                dueDate,
                rule.gracePeriodDays,
                rule.isBusinessDays,
                holidaySet,
              )
            : null;

        const title =
          rule.description?.trim() ||
          `Customs seizure response (${rule.jurisdiction})`;

        const deadline = await tx.deadline.create({
          data: {
            matterId,
            ruleId: rule.id,
            sourceCustomsSeizureId: seizureId,
            title,
            jurisdiction: rule.jurisdiction,
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
            title: `${title} - due ${formatDeadlineDate(dueDate)}`,
            description: `Response deadline set from customs seizure dated ${formatDeadlineDate(baseDate)}.`,
            occurredAt: new Date(),
            createdById: userId,
            metadata: {
              deadlineId: deadline.id,
              seizureId,
              ruleId: rule.id,
              jurisdiction: rule.jurisdiction,
              dueDate: dueDate.toISOString(),
              graceDate: graceDate?.toISOString() ?? null,
              supersededCount: supersedeResult.count,
            } as Prisma.InputJsonValue,
          },
        });
      }
    });

    for (const deadlineId of createdDeadlineIds) {
      void this.deadlineNotify.notifyAssigned(deadlineId).catch(() => undefined);
    }

    return {
      matterId,
      seizureId,
      created,
      deadlineIds: createdDeadlineIds,
    };
  }
}
