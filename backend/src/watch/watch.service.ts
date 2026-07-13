import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MatterStatus,
  MatterType,
  Prisma,
  WatchAlertStatus,
  WatchProfileStatus,
  WatchRegistrySource,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MattersService } from '../matters/matters.service';
import { parseLimit } from '../crm/dto/pagination.dto';
import {
  REGISTRY_DEFAULT_JURISDICTION,
  WATCH_CANONICAL_JURISDICTIONS,
} from './watch.constants';
import {
  CreateMockWatchAlertDto,
  ListWatchAlertsQueryDto,
} from './dto/watch-alert.dto';
import {
  CreateWatchProfileDto,
  UpdateWatchProfileDto,
} from './dto/watch-profile.dto';
import { WatchAlertNotifyService } from './watch-alert-notify.service';
import {
  scoreMarkSimilarity,
  WATCH_MATCH_METHOD,
} from './watch-similarity.util';

const userSelect = { id: true, fullName: true, email: true } as const;

const watchProfileInclude = {
  createdBy: { select: userSelect },
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
  _count: { select: { alerts: true } },
} satisfies Prisma.WatchProfileInclude;

const watchAlertListInclude = {
  watchProfile: {
    select: {
      id: true,
      markText: true,
      jurisdictions: true,
      niceClasses: true,
      status: true,
    },
  },
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
  triagedBy: { select: userSelect },
  matter: { select: { id: true, title: true, status: true } },
} satisfies Prisma.WatchAlertInclude;

@Injectable()
export class WatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matters: MattersService,
    private readonly alertNotify: WatchAlertNotifyService,
  ) {}

  async listProfilesForClient(clientId: string) {
    await this.assertClientExists(clientId);

    const items = await this.prisma.watchProfile.findMany({
      where: { clientId, status: { not: WatchProfileStatus.archived } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: watchProfileInclude,
    });

    return { items };
  }

  async createProfile(
    clientId: string,
    dto: CreateWatchProfileDto,
    userId: string,
  ) {
    await this.assertClientExists(clientId);

    return this.prisma.watchProfile.create({
      data: {
        clientId,
        markText: dto.markText.trim(),
        jurisdictions: dto.jurisdictions.map((j) => j.toUpperCase()),
        niceClasses: dto.niceClasses ?? [],
        frequency: dto.frequency,
        createdById: userId,
      },
      include: watchProfileInclude,
    });
  }

  async updateProfile(id: string, dto: UpdateWatchProfileDto) {
    const existing = await this.prisma.watchProfile.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Watch profile not found');

    return this.prisma.watchProfile.update({
      where: { id },
      data: { status: dto.status },
      include: watchProfileInclude,
    });
  }

  async listAlerts(query: ListWatchAlertsQueryDto) {
    const take = parseLimit(query.limit);
    const where: Prisma.WatchAlertWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.clientId) where.clientId = query.clientId;
    if (query.jurisdiction) where.jurisdiction = query.jurisdiction;
    if (query.source) where.source = query.source;
    if (query.minSimilarity != null) {
      where.similarityScore = { gte: query.minSimilarity };
    }

    const statsWhere: Prisma.WatchAlertWhereInput = { ...where };
    delete statsWhere.status;

    const sortBy = query.sortBy ?? 'detectedAt';
    const orderBy: Prisma.WatchAlertOrderByWithRelationInput[] =
      sortBy === 'similarity'
        ? [
            { similarityScore: { sort: 'desc', nulls: 'last' } },
            { id: 'desc' },
          ]
        : [{ detectedAt: 'desc' }, { id: 'desc' }];

    const rows = await this.prisma.watchAlert.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: watchAlertListInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    const [newCount, acceptedCount, rejectedCount] = await Promise.all([
      this.prisma.watchAlert.count({
        where: { ...statsWhere, status: WatchAlertStatus.new },
      }),
      this.prisma.watchAlert.count({
        where: { ...statsWhere, status: WatchAlertStatus.accepted },
      }),
      this.prisma.watchAlert.count({
        where: { ...statsWhere, status: WatchAlertStatus.rejected },
      }),
    ]);

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
      newCount,
      acceptedCount,
      rejectedCount,
    };
  }

  async findAlert(id: string) {
    const alert = await this.prisma.watchAlert.findUnique({
      where: { id },
      include: {
        ...watchAlertListInclude,
        watchProfile: {
          include: {
            createdBy: { select: userSelect },
          },
        },
      },
    });
    if (!alert) throw new NotFoundException('Watch alert not found');
    return alert;
  }

  async createMockAlert(dto: CreateMockWatchAlertDto) {
    let profile = dto.watchProfileId
      ? await this.prisma.watchProfile.findUnique({
          where: { id: dto.watchProfileId },
        })
      : null;

    if (!profile && dto.clientId) {
      profile = await this.prisma.watchProfile.findFirst({
        where: {
          clientId: dto.clientId,
          status: WatchProfileStatus.active,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!profile) {
      throw new BadRequestException(
        'Provide watchProfileId or clientId with an active watch profile',
      );
    }

    const source = dto.source ?? WatchRegistrySource.EUIPO;
    const jurisdiction =
      dto.jurisdiction ??
      REGISTRY_DEFAULT_JURISDICTION[source] ??
      profile.jurisdictions[0] ??
      null;

    if (
      jurisdiction &&
      !WATCH_CANONICAL_JURISDICTIONS.includes(
        jurisdiction as (typeof WATCH_CANONICAL_JURISDICTIONS)[number],
      )
    ) {
      throw new BadRequestException('Invalid jurisdiction code');
    }

    const conflictingMark = dto.conflictingMark?.trim() ?? 'Koka-Cola';
    const similarityScore = await scoreMarkSimilarity(
      conflictingMark,
      profile.markText,
      this.prisma,
    );

    const alert = await this.prisma.watchAlert.create({
      data: {
        watchProfileId: profile.id,
        clientId: profile.clientId,
        conflictingMark,
        source,
        jurisdiction,
        applicationNumber: dto.applicationNumber ?? '018765432',
        status: WatchAlertStatus.new,
        similarityScore,
        matchMethod: similarityScore != null ? WATCH_MATCH_METHOD : null,
      },
      include: watchAlertListInclude,
    });

    await this.alertNotify.notifyAlertCreated(alert.id);
    return alert;
  }

  async rejectAlert(id: string, userId: string) {
    const alert = await this.prisma.watchAlert.findUnique({ where: { id } });
    if (!alert) throw new NotFoundException('Watch alert not found');
    if (alert.status !== WatchAlertStatus.new) {
      throw new BadRequestException('Alert has already been triaged');
    }

    const updated = await this.prisma.watchAlert.update({
      where: { id },
      data: {
        status: WatchAlertStatus.rejected,
        triagedAt: new Date(),
        triagedById: userId,
      },
      include: watchAlertListInclude,
    });

    await this.alertNotify.notifyAlertTriaged(id, 'rejected');
    return updated;
  }

  async acceptAlert(id: string, userId: string) {
    const alert = await this.prisma.watchAlert.findUnique({
      where: { id },
      include: {
        watchProfile: true,
        client: { select: { assignedUserId: true } },
      },
    });
    if (!alert) throw new NotFoundException('Watch alert not found');
    if (alert.status !== WatchAlertStatus.new) {
      throw new BadRequestException('Alert has already been triaged');
    }

    const jurisdictionCodes = this.resolveJurisdictions(alert);
    const matter = await this.matters.create(
      {
        clientId: alert.clientId,
        matterType: MatterType.dispute_opposition,
        title: `Opposition: ${alert.conflictingMark}`,
        status: MatterStatus.draft,
        assignedToId: alert.client.assignedUserId ?? undefined,
        description: [
          `Watch alert accepted.`,
          `Watched mark: ${alert.watchProfile.markText}`,
          `Conflicting mark: ${alert.conflictingMark}`,
          `Registry source: ${alert.source}`,
          alert.applicationNumber
            ? `Application: ${alert.applicationNumber}`
            : null,
        ]
          .filter(Boolean)
          .join('\n'),
        jurisdictions: jurisdictionCodes.map((countryCode) => ({
          countryCode,
        })),
      },
      userId,
    );

    const updated = await this.prisma.watchAlert.update({
      where: { id },
      data: {
        status: WatchAlertStatus.accepted,
        matterId: matter.id,
        triagedAt: new Date(),
        triagedById: userId,
      },
      include: watchAlertListInclude,
    });

    await this.alertNotify.notifyAlertTriaged(id, 'accepted');

    return { alert: updated, matter };
  }

  private resolveJurisdictions(alert: {
    jurisdiction: string | null;
    watchProfile: { jurisdictions: string[] };
  }) {
    if (alert.jurisdiction) return [alert.jurisdiction.toUpperCase()];
    if (alert.watchProfile.jurisdictions.length > 0) {
      return alert.watchProfile.jurisdictions.map((j) => j.toUpperCase());
    }
    return ['BG'];
  }

  private async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client not found');
  }
}
