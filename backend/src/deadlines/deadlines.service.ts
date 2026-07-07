import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterTimelineEventType,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortalAccessService } from '../common/portal-access.service';
import { parseLimit } from '../crm/dto/pagination.dto';
import { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ACTIVE_DEADLINE_STATUSES,
  HIDDEN_DEADLINE_STATUSES,
  UPCOMING_DEADLINE_WINDOW_DAYS,
} from './deadlines.constants';
import { addDays } from './deadlines.utils';
import { expandDeadlineRuleJurisdictions } from './deadline-jurisdiction.utils';
import {
  CreateDeadlineDto,
  ListAllDeadlinesQueryDto,
  MyDeadlinesQueryDto,
} from './dto/deadline.dto';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTimelineDate(iso: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(iso);
}

const deadlineInclude = {
  assignedTo: { select: { id: true, fullName: true, email: true } },
  rule: {
    select: {
      id: true,
      jurisdiction: true,
      eventType: true,
      priority: true,
      description: true,
    },
  },
  matter: {
    select: {
      id: true,
      title: true,
      matterType: true,
      client: {
        select: {
          id: true,
          internalCode: true,
          companyName: true,
          firstName: true,
          lastName: true,
          type: true,
        },
      },
    },
  },
} satisfies Prisma.DeadlineInclude;

@Injectable()
export class DeadlinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portalAccess: PortalAccessService,
    private readonly deadlineNotify: DeadlineNotifyService,
  ) {}

  async generateInitialDeadlines(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      include: { jurisdictions: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const assigneeId = matter.assignedToId ?? matter.filedById;
    if (!assigneeId) {
      return {
        matterId,
        created: 0,
        updated: 0,
        skipped: 'no_assignee' as const,
      };
    }

    const jurisdictions = expandDeadlineRuleJurisdictions(
      matter.jurisdictions.map((j) => j.countryCode),
      matter.matterType,
    );

    if (jurisdictions.length === 0) {
      return {
        matterId,
        created: 0,
        updated: 0,
        skipped: 'no_jurisdictions' as const,
      };
    }

    const { created, updated } = await this.applyMatterCreatedRules({
      matterId,
      matterType: matter.matterType,
      assigneeId,
      jurisdictions,
      baseDate: matter.createdAt,
    });

    return { matterId, created, updated };
  }

  /** Generate (or recalculate) prosecution deadlines from an IP right filing date. */
  async generateDeadlinesFromFiling(
    matterId: string,
    params: {
      jurisdiction: string;
      filingDate: Date;
      userId: string;
      ipRightId: string;
    },
  ) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: {
        id: true,
        matterType: true,
        assignedToId: true,
        filedById: true,
      },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const assigneeId = matter.assignedToId ?? matter.filedById;
    if (!assigneeId) {
      return {
        matterId,
        created: 0,
        updated: 0,
        skipped: 'no_assignee' as const,
      };
    }

    const jurisdiction = params.jurisdiction.trim().toUpperCase();
    const ruleJurisdictions = expandDeadlineRuleJurisdictions(
      [jurisdiction],
      matter.matterType,
    );
    if (ruleJurisdictions.length === 0) {
      return {
        matterId,
        created: 0,
        updated: 0,
        skipped: 'no_jurisdictions' as const,
      };
    }

    const { created, updated } = await this.applyMatterCreatedRules({
      matterId,
      matterType: matter.matterType,
      assigneeId,
      jurisdictions: ruleJurisdictions,
      baseDate: params.filingDate,
      userId: params.userId,
      recordTimeline: true,
      sourceIpRightId: params.ipRightId,
    });

    return { matterId, jurisdiction, created, updated };
  }

  private async applyMatterCreatedRules(params: {
    matterId: string;
    matterType: MatterType;
    assigneeId: string;
    jurisdictions: string[];
    baseDate: Date;
    userId?: string;
    recordTimeline?: boolean;
    sourceIpRightId?: string;
  }) {
    const {
      matterId,
      matterType,
      assigneeId,
      jurisdictions,
      baseDate,
      userId,
      recordTimeline,
      sourceIpRightId,
    } = params;

    let created = 0;
    let updated = 0;

    for (const jurisdiction of jurisdictions) {
      const rules = await this.prisma.deadlineRule.findMany({
        where: {
          jurisdiction,
          matterType,
          triggerType: DeadlineRuleTriggerType.matter_created,
        },
      });

      for (const rule of rules) {
        const dueDate = addDays(baseDate, rule.daysOffset, rule.isBusinessDays);
        const graceDate =
          rule.gracePeriodDays > 0
            ? addDays(dueDate, rule.gracePeriodDays, rule.isBusinessDays)
            : null;

        const title =
          rule.description ??
          `${jurisdiction} ${rule.eventType.replace('_', ' ')}`;

        const existing = await this.prisma.deadline.findFirst({
          where: {
            matterId,
            ruleId: rule.id,
            sourceCorrespondenceId: null,
          },
        });

        if (existing) {
          if (
            (ACTIVE_DEADLINE_STATUSES as readonly string[]).includes(
              existing.status,
            )
          ) {
            await this.prisma.deadline.update({
              where: { id: existing.id },
              data: { dueDate, graceDate, title, assignedToId: assigneeId },
            });
            updated += 1;
          }
          continue;
        }

        const deadline = await this.prisma.deadline.create({
          data: {
            matterId,
            ruleId: rule.id,
            title,
            dueDate,
            graceDate,
            assignedToId: assigneeId,
            status: DeadlineStatus.pending,
          },
        });
        created += 1;

        void this.deadlineNotify
          .notifyAssigned(deadline.id)
          .catch(() => undefined);

        if (recordTimeline && userId) {
          const dueLabel = formatTimelineDate(dueDate);
          await this.prisma.matterTimelineEvent.create({
            data: {
              matterId,
              eventType: MatterTimelineEventType.deadline,
              title: `${title} - due ${dueLabel}`,
              description: `Prosecution deadline set from filing date ${formatTimelineDate(baseDate)}.`,
              occurredAt: new Date(),
              createdById: userId,
              metadata: {
                deadlineId: deadline.id,
                ruleId: rule.id,
                jurisdiction,
                dueDate: dueDate.toISOString(),
                graceDate: graceDate?.toISOString() ?? null,
                sourceIpRightId: sourceIpRightId ?? null,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }

    return { created, updated };
  }

  async countDueToday(assignedToId?: string) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.prisma.deadline.count({
      where: {
        ...(assignedToId ? { assignedToId } : {}),
        status: { in: [...ACTIVE_DEADLINE_STATUSES] },
        dueDate: { gte: today, lt: tomorrow },
      },
    });

    return { count };
  }

  async countDueTodayForUser(user: AuthenticatedUser) {
    const scopeClientId = this.portalAccess.requireScopeClientId(user);
    if (scopeClientId) {
      return this.countDueTodayForClient(scopeClientId);
    }
    return this.countDueToday(user.userId);
  }

  private async countDueTodayForClient(clientId: string) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.prisma.deadline.count({
      where: {
        matter: { clientId },
        status: { in: [...ACTIVE_DEADLINE_STATUSES] },
        dueDate: { gte: today, lt: tomorrow },
      },
    });

    return { count };
  }

  private myDeadlinesScope(user: AuthenticatedUser): Prisma.DeadlineWhereInput {
    const scopeClientId = this.portalAccess.requireScopeClientId(user);
    if (scopeClientId) {
      return { matter: { clientId: scopeClientId } };
    }
    return { assignedToId: user.userId };
  }

  async listForMatter(matterId: string) {
    await this.assertMatterExists(matterId);
    return this.prisma.deadline.findMany({
      where: {
        matterId,
        status: { notIn: [...HIDDEN_DEADLINE_STATUSES] },
      },
      orderBy: [{ createdAt: 'desc' }, { dueDate: 'desc' }],
      include: deadlineInclude,
    });
  }

  async listMyDeadlines(user: AuthenticatedUser, query: MyDeadlinesQueryDto) {
    const take = parseLimit(query.limit, 50);

    const where: Prisma.DeadlineWhereInput = {
      ...this.myDeadlinesScope(user),
    };

    if (query.status) {
      where.status = query.status;
    } else if (query.tab === 'completed') {
      where.status = DeadlineStatus.completed;
    } else if (query.tab === 'pending') {
      where.status = DeadlineStatus.pending;
    } else if (query.tab === 'in_progress') {
      where.status = DeadlineStatus.in_progress;
    } else if (query.tab === 'overdue') {
      where.status = {
        in: [...ACTIVE_DEADLINE_STATUSES, 'missed', 'escalated'],
      };
      where.dueDate = { lt: startOfDay(new Date()) };
    } else if (query.tab === 'all') {
      where.status = { notIn: [...HIDDEN_DEADLINE_STATUSES] };
    } else {
      where.status = { in: [...ACTIVE_DEADLINE_STATUSES] };
    }

    const rows = await this.prisma.deadline.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: deadlineInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async listAllDeadlines(query: ListAllDeadlinesQueryDto) {
    const take = parseLimit(query.limit, 50);
    const where: Prisma.DeadlineWhereInput = {
      status: { notIn: [...HIDDEN_DEADLINE_STATUSES] },
    };

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }
    if (query.matterType) {
      where.matter = { matterType: query.matterType };
    }
    if (query.jurisdiction) {
      where.OR = [
        { jurisdiction: query.jurisdiction },
        { rule: { jurisdiction: query.jurisdiction } },
      ];
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.overdue) {
      where.status = {
        in: [...ACTIVE_DEADLINE_STATUSES, 'missed', 'escalated'],
      };
      where.dueDate = { lt: startOfDay(new Date()) };
    }
    if (query.dueFrom || query.dueTo) {
      where.dueDate = {
        ...(query.dueFrom ? { gte: new Date(query.dueFrom) } : {}),
        ...(query.dueTo ? { lte: new Date(query.dueTo) } : {}),
      };
    }

    const rows = await this.prisma.deadline.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: deadlineInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async createManual(dto: CreateDeadlineDto, userId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: dto.matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    const dueDate = new Date(dto.dueDate);
    const graceDate = dto.graceDate ? new Date(dto.graceDate) : null;

    const deadline = await this.prisma.$transaction(async (tx) => {
      const created = await tx.deadline.create({
        data: {
          matterId: dto.matterId,
          title: dto.title.trim(),
          jurisdiction: dto.jurisdiction.trim().toUpperCase(),
          notes: dto.notes?.trim() || null,
          dueDate,
          graceDate,
          assignedToId: dto.assignedToId,
          status: DeadlineStatus.pending,
        },
        include: deadlineInclude,
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId: dto.matterId,
          eventType: MatterTimelineEventType.deadline,
          title: `Deadline added manually - ${dto.title.trim()}, due ${formatTimelineDate(dueDate)}`,
          occurredAt: new Date(),
          createdById: userId,
        },
      });

      return created;
    });

    void this.deadlineNotify.notifyAssigned(deadline.id).catch(() => undefined);

    return deadline;
  }

  async updateStatus(id: string, status: DeadlineStatus, userId: string) {
    const deadline = await this.prisma.deadline.findUnique({
      where: { id },
      include: deadlineInclude,
    });
    if (!deadline) throw new NotFoundException('Deadline not found');

    if (
      deadline.assignedToId !== userId &&
      status !== DeadlineStatus.completed
    ) {
      // allow assignee to update; docketing can update any via permission only
    }

    return this.prisma.deadline.update({
      where: { id },
      data: {
        status,
        completedAt: status === DeadlineStatus.completed ? new Date() : null,
        escalationLevel:
          status === DeadlineStatus.escalated
            ? deadline.escalationLevel + 1
            : deadline.escalationLevel,
      },
      include: deadlineInclude,
    });
  }

  async countUpcomingByMatterIds(matterIds: string[]) {
    if (matterIds.length === 0) return new Map<string, number>();

    const windowEnd = new Date();
    windowEnd.setDate(windowEnd.getDate() + UPCOMING_DEADLINE_WINDOW_DAYS);

    const groups = await this.prisma.deadline.groupBy({
      by: ['matterId'],
      where: {
        matterId: { in: matterIds },
        status: { in: [...ACTIVE_DEADLINE_STATUSES] },
        dueDate: { lte: windowEnd },
      },
      _count: { _all: true },
    });

    return new Map(groups.map((g) => [g.matterId, g._count._all]));
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }
}
