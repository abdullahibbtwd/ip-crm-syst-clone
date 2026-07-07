import { Injectable } from '@nestjs/common';
import { Prisma, RenewalStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RenewalsSummaryQueryDto } from './dto/renewals-summary-query.dto';
import {
  ACTIVE_RENEWAL_PIPELINE_STATUSES,
  isCriticalRenewalUrgency,
  renewalUrgency,
  type RenewalUrgencyTier,
} from './renewal-urgency.util';

const DEFAULT_DUE_WITHIN_DAYS = 90;

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function clientDisplayName(client: {
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  internalCode: string | null;
}) {
  if (client.companyName) return client.companyName;
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return name || client.internalCode || 'Client';
}

type UrgencyCounts = Record<RenewalUrgencyTier, number> & {
  critical: number;
};

function emptyUrgencyCounts(): UrgencyCounts {
  return {
    overdue: 0,
    today: 0,
    urgent: 0,
    soon: 0,
    ok: 0,
    completed: 0,
    critical: 0,
  };
}

function bumpUrgency(counts: UrgencyCounts, tier: RenewalUrgencyTier) {
  counts[tier] += 1;
  if (isCriticalRenewalUrgency(tier)) counts.critical += 1;
}

@Injectable()
export class ReportsRenewalsSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getRenewalsSummary(query: RenewalsSummaryQueryDto) {
    const now = new Date();
    const dueBefore = query.dueBefore
      ? new Date(query.dueBefore)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + DEFAULT_DUE_WITHIN_DAYS);

    const where: Prisma.RenewalWindowWhereInput = {
      dueDate: { lte: dueBefore },
      ...(query.jurisdiction
        ? { jurisdiction: query.jurisdiction.trim().toUpperCase() }
        : {}),
    };

    const rows = await this.prisma.renewalWindow.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }],
      select: {
        id: true,
        jurisdiction: true,
        dueDate: true,
        status: true,
        cycleNumber: true,
        matter: { select: { id: true, title: true, matterType: true } },
        client: {
          select: {
            id: true,
            companyName: true,
            firstName: true,
            lastName: true,
            internalCode: true,
          },
        },
        ipRight: { select: { title: true, registrationNumber: true } },
      },
    });

    const byStatus: Record<string, number> = {
      upcoming: 0,
      instructed: 0,
      filed: 0,
      completed: 0,
      lapsed: 0,
    };
    const byMonth = new Map<
      string,
      { month: string; count: number; byStatus: Record<string, number> }
    >();
    const byJurisdiction = new Map<
      string,
      { jurisdiction: string; count: number; byStatus: Record<string, number> }
    >();
    const urgency = emptyUrgencyCounts();

    const preview: Array<{
      id: string;
      clientId: string;
      clientName: string;
      matterId: string;
      matterTitle: string;
      ipRightTitle: string;
      jurisdiction: string;
      dueDate: string;
      status: RenewalStatus;
      cycleNumber: number;
      urgency: RenewalUrgencyTier;
    }> = [];

    for (const row of rows) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;

      const month = monthKey(new Date(row.dueDate));
      let monthBucket = byMonth.get(month);
      if (!monthBucket) {
        monthBucket = {
          month,
          count: 0,
          byStatus: {
            upcoming: 0,
            instructed: 0,
            filed: 0,
            completed: 0,
            lapsed: 0,
          },
        };
        byMonth.set(month, monthBucket);
      }
      monthBucket.count += 1;
      monthBucket.byStatus[row.status] =
        (monthBucket.byStatus[row.status] ?? 0) + 1;

      const jKey = row.jurisdiction.toUpperCase();
      let jBucket = byJurisdiction.get(jKey);
      if (!jBucket) {
        jBucket = {
          jurisdiction: jKey,
          count: 0,
          byStatus: { upcoming: 0, instructed: 0, filed: 0, completed: 0, lapsed: 0 },
        };
        byJurisdiction.set(jKey, jBucket);
      }
      jBucket.count += 1;
      jBucket.byStatus[row.status] = (jBucket.byStatus[row.status] ?? 0) + 1;

      const tier = renewalUrgency(new Date(row.dueDate), row.status);
      if (ACTIVE_RENEWAL_PIPELINE_STATUSES.includes(row.status)) {
        bumpUrgency(urgency, tier);
      }

      preview.push({
        id: row.id,
        clientId: row.client.id,
        clientName: clientDisplayName(row.client),
        matterId: row.matter.id,
        matterTitle: row.matter.title,
        ipRightTitle: row.ipRight.title,
        jurisdiction: jKey,
        dueDate: row.dueDate.toISOString(),
        status: row.status,
        cycleNumber: row.cycleNumber,
        urgency: tier,
      });
    }

    const URGENCY_SORT: Record<RenewalUrgencyTier, number> = {
      overdue: 0,
      today: 1,
      urgent: 2,
      soon: 3,
      ok: 4,
      completed: 5,
    };

    preview.sort(
      (a, b) =>
        URGENCY_SORT[a.urgency] - URGENCY_SORT[b.urgency] ||
        a.dueDate.localeCompare(b.dueDate),
    );

    const pipelineTotal = ACTIVE_RENEWAL_PIPELINE_STATUSES.reduce(
      (sum, s) => sum + (byStatus[s] ?? 0),
      0,
    );

    return {
      generatedAt: now.toISOString(),
      dueBefore: dueBefore.toISOString(),
      summary: {
        total: rows.length,
        pipelineTotal,
        upcoming: byStatus.upcoming,
        instructed: byStatus.instructed,
        filed: byStatus.filed,
        completed: byStatus.completed,
        lapsed: byStatus.lapsed,
        critical: urgency.critical,
      },
      byStatus,
      urgency,
      byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
      byJurisdiction: [...byJurisdiction.values()].sort((a, b) =>
        a.jurisdiction.localeCompare(b.jurisdiction),
      ),
      preview: preview.slice(0, 50),
    };
  }
}
