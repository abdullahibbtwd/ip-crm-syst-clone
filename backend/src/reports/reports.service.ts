import { Injectable } from '@nestjs/common';
import { DeadlineStatus, Prisma } from '../../generated/prisma/client';
import { HIDDEN_DEADLINE_STATUSES } from '../deadlines/deadlines.constants';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlineRiskQueryDto } from './dto/deadline-risk-query.dto';
import { DEFAULT_DEADLINE_RISK_WINDOW_DAYS } from './reports.constants';
import {
  daysUntilDue,
  deadlineUrgency,
  isCriticalUrgency,
  type UrgencyTier,
} from './urgency.util';

const riskInclude = {
  assignedTo: { select: { id: true, fullName: true, email: true } },
  rule: { select: { jurisdiction: true } },
  matter: {
    select: {
      id: true,
      title: true,
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

type RiskDeadlineRow = Prisma.DeadlineGetPayload<{ include: typeof riskInclude }>;

export type UrgencyCounts = Record<UrgencyTier, number> & {
  total: number;
  critical: number;
};

function emptyCounts(): UrgencyCounts {
  return {
    overdue: 0,
    today: 0,
    urgent: 0,
    soon: 0,
    ok: 0,
    completed: 0,
    total: 0,
    critical: 0,
  };
}

function bumpCounts(counts: UrgencyCounts, tier: UrgencyTier) {
  counts[tier] += 1;
  counts.total += 1;
  if (isCriticalUrgency(tier)) counts.critical += 1;
}

function resolveJurisdiction(row: RiskDeadlineRow): string {
  return (row.jurisdiction ?? row.rule?.jurisdiction ?? 'UNSPECIFIED').toUpperCase();
}

function passesRiskWindow(
  row: RiskDeadlineRow,
  windowDays: number,
  now = new Date(),
): boolean {
  if (
    row.status === DeadlineStatus.missed ||
    row.status === DeadlineStatus.escalated
  ) {
    return true;
  }
  const days = daysUntilDue(row.dueDate, now);
  return days < 0 || days <= windowDays;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDeadlineRisk(query: DeadlineRiskQueryDto) {
    const windowDays = query.dueWithinDays ?? DEFAULT_DEADLINE_RISK_WINDOW_DAYS;
    const now = new Date();

    const where: Prisma.DeadlineWhereInput = {
      status: { notIn: [...HIDDEN_DEADLINE_STATUSES, DeadlineStatus.completed] },
    };

    if (query.assignedToId) {
      where.assignedToId = query.assignedToId;
    }
    if (query.jurisdiction) {
      const j = query.jurisdiction.trim().toUpperCase();
      where.OR = [{ jurisdiction: j }, { rule: { jurisdiction: j } }];
    }
    if (query.clientId) {
      where.matter = { clientId: query.clientId };
    }

    const rows = await this.prisma.deadline.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      include: riskInclude,
    });

    const filtered = rows.filter((row) => passesRiskWindow(row, windowDays, now));

    type AssigneeBucket = {
      assignee: RiskDeadlineRow['assignedTo'];
      counts: UrgencyCounts;
      deadlines: Array<{
        id: string;
        title: string;
        dueDate: string;
        status: DeadlineStatus;
        escalationLevel: number;
        urgency: UrgencyTier;
        matterId: string;
        matterTitle: string;
      }>;
    };

    type JurisdictionBucket = {
      jurisdiction: string;
      counts: UrgencyCounts;
      assignees: Map<string, AssigneeBucket>;
    };

    type ClientBucket = {
      client: NonNullable<RiskDeadlineRow['matter']>['client'];
      counts: UrgencyCounts;
      jurisdictions: Map<string, JurisdictionBucket>;
    };

    const clientMap = new Map<string, ClientBucket>();
    const summary = emptyCounts();

    for (const row of filtered) {
      if (!row.matter?.client) continue;

      const urgency = deadlineUrgency(row.dueDate, row.status);
      const clientId = row.matter.client.id;
      const jurisdiction = resolveJurisdiction(row);
      const assigneeId = row.assignedTo.id;

      bumpCounts(summary, urgency);

      let clientBucket = clientMap.get(clientId);
      if (!clientBucket) {
        clientBucket = {
          client: row.matter.client,
          counts: emptyCounts(),
          jurisdictions: new Map(),
        };
        clientMap.set(clientId, clientBucket);
      }
      bumpCounts(clientBucket.counts, urgency);

      let jurisdictionBucket = clientBucket.jurisdictions.get(jurisdiction);
      if (!jurisdictionBucket) {
        jurisdictionBucket = {
          jurisdiction,
          counts: emptyCounts(),
          assignees: new Map(),
        };
        clientBucket.jurisdictions.set(jurisdiction, jurisdictionBucket);
      }
      bumpCounts(jurisdictionBucket.counts, urgency);

      let assigneeBucket = jurisdictionBucket.assignees.get(assigneeId);
      if (!assigneeBucket) {
        assigneeBucket = {
          assignee: row.assignedTo,
          counts: emptyCounts(),
          deadlines: [],
        };
        jurisdictionBucket.assignees.set(assigneeId, assigneeBucket);
      }
      bumpCounts(assigneeBucket.counts, urgency);
      assigneeBucket.deadlines.push({
        id: row.id,
        title: row.title,
        dueDate: row.dueDate.toISOString(),
        status: row.status,
        escalationLevel: row.escalationLevel,
        urgency,
        matterId: row.matter.id,
        matterTitle: row.matter.title,
      });
    }

    const groups = [...clientMap.values()]
      .sort((a, b) => clientSortKey(a.client).localeCompare(clientSortKey(b.client)))
      .map((clientBucket) => ({
        client: clientBucket.client,
        counts: clientBucket.counts,
        jurisdictions: [...clientBucket.jurisdictions.values()]
          .sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction))
          .map((jurisdictionBucket) => ({
            jurisdiction: jurisdictionBucket.jurisdiction,
            counts: jurisdictionBucket.counts,
            assignees: [...jurisdictionBucket.assignees.values()]
              .sort((a, b) =>
                a.assignee.fullName.localeCompare(b.assignee.fullName),
              )
              .map((assigneeBucket) => ({
                assignee: assigneeBucket.assignee,
                counts: assigneeBucket.counts,
                deadlines: assigneeBucket.deadlines,
              })),
          })),
      }));

    return {
      generatedAt: now.toISOString(),
      windowDays,
      summary: {
        ...summary,
        clients: groups.length,
      },
      groups,
    };
  }
}

function clientSortKey(client: {
  type: string;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  internalCode: string | null;
}): string {
  if (client.type === 'company' && client.companyName) {
    return client.companyName;
  }
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return name || client.internalCode || 'zzz';
}
