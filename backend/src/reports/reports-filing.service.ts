import { Injectable } from '@nestjs/common';
import {
  MatterTimelineEventType,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FilingVolumesQueryDto } from './dto/filing-volumes-query.dto';

function monthKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function resolvePeriod(query: FilingVolumesQueryDto) {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getFullYear(), to.getMonth() - 11, 1);
  return { from, to };
}

function resolveJurisdiction(
  metadata: Prisma.JsonValue | null,
  ipRightJurisdiction: string | null | undefined,
): string {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const j = (metadata as Record<string, unknown>).jurisdiction;
    if (typeof j === 'string' && j.trim()) return j.trim().toUpperCase();
  }
  if (ipRightJurisdiction) return ipRightJurisdiction.toUpperCase();
  return 'UNSPECIFIED';
}

@Injectable()
export class ReportsFilingService {
  constructor(private readonly prisma: PrismaService) {}

  async getFilingVolumes(query: FilingVolumesQueryDto) {
    const now = new Date();
    const period = resolvePeriod(query);

    const where: Prisma.MatterTimelineEventWhereInput = {
      eventType: MatterTimelineEventType.filing,
      occurredAt: { gte: period.from, lte: period.to },
      ...(query.matterType ? { matter: { matterType: query.matterType } } : {}),
    };

    const rows = await this.prisma.matterTimelineEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }],
      select: {
        id: true,
        title: true,
        occurredAt: true,
        metadata: true,
        matter: {
          select: {
            id: true,
            title: true,
            matterType: true,
          },
        },
        ipRight: {
          select: { jurisdiction: true },
        },
      },
    });

    const jurisdictionFilter = query.jurisdiction?.trim().toUpperCase();
    const filtered = jurisdictionFilter
      ? rows.filter(
          (r) =>
            resolveJurisdiction(r.metadata, r.ipRight?.jurisdiction) ===
            jurisdictionFilter,
        )
      : rows;

    const byMonth = new Map<
      string,
      {
        month: string;
        count: number;
        byMatterType: Record<string, number>;
        byJurisdiction: Record<string, number>;
      }
    >();
    const byMatterType: Record<string, number> = {};
    const byJurisdiction: Record<string, number> = {};

    for (const row of filtered) {
      const matterType = row.matter.matterType;
      const jurisdiction = resolveJurisdiction(
        row.metadata,
        row.ipRight?.jurisdiction,
      );
      const key = monthKey(new Date(row.occurredAt));

      byMatterType[matterType] = (byMatterType[matterType] ?? 0) + 1;
      byJurisdiction[jurisdiction] = (byJurisdiction[jurisdiction] ?? 0) + 1;

      let bucket = byMonth.get(key);
      if (!bucket) {
        bucket = {
          month: key,
          count: 0,
          byMatterType: {},
          byJurisdiction: {},
        };
        byMonth.set(key, bucket);
      }
      bucket.count += 1;
      bucket.byMatterType[matterType] =
        (bucket.byMatterType[matterType] ?? 0) + 1;
      bucket.byJurisdiction[jurisdiction] =
        (bucket.byJurisdiction[jurisdiction] ?? 0) + 1;
    }

    const preview = filtered.slice(0, 50).map((row) => ({
      id: row.id,
      title: row.title,
      occurredAt: row.occurredAt.toISOString(),
      matterId: row.matter.id,
      matterTitle: row.matter.title,
      matterType: row.matter.matterType,
      jurisdiction: resolveJurisdiction(row.metadata, row.ipRight?.jurisdiction),
    }));

    return {
      generatedAt: now.toISOString(),
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      summary: {
        totalFilings: filtered.length,
        byMatterType,
        byJurisdiction,
      },
      byMonth: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
      preview,
    };
  }
}
