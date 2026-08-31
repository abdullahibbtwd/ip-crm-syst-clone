import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientApprovalStatus,
  CorrespondenceDirection,
  CorrespondenceStatus,
  DeadlineStatus,
  InvoiceStatus,
  IpRightStatus,
  MatterJurisdictionStatus,
  MatterStatus,
  MatterType,
  MatterTimelineEventType,
  PartnerInstructionStatus,
  PaymentStatus,
  Prisma,
  TaskStatus,
  type IntakeLead,
  type Counterparty,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortalAccessService } from '../common/portal-access.service';
import { parseLimit, parsePage } from '../crm/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildMatterAttributesFromIntake,
  buildMatterTitle,
  INTAKE_TYPES_WITH_DRAFT_IP_RIGHT,
  mapIntakeMatterType,
} from '../intake/intake-matter.mapper';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { MATTER_CLOSE_ROLES } from './matters.constants';
import { CreateIpRightDto } from './dto/ip-right.dto';
import { FileIpRightDto } from './dto/file-ip-right.dto';
import {
  CreateMatterDto,
  MatterQueryDto,
  UpdateMatterDto,
} from './dto/matter.dto';
import {
  filingAuthorityForJurisdiction,
  filingTimelineTitle,
} from './ip-right-filing.utils';
import { countSecondaryTrademarkActions } from './trademark-action.utils';
import { extractTrademarkListSummary } from './trademark-list-summary.utils';
import {
  normalizeTrademarkProcedureShelfKey,
  readTrademarkProcedureFromAttributes,
  trademarkProcedureFilter,
} from './trademark-procedure-filter.utils';
import { trademarkListFilterWhere } from './trademark-list-filter.utils';
import { OppositionPdfService } from './opposition-pdf.service';
import type { OppositionPdfLang } from './opposition-pdf.utils';

const userSelect = { id: true, fullName: true, email: true } as const;

const clientPartySelect = {
  id: true,
  internalCode: true,
  companyName: true,
  firstName: true,
  lastName: true,
  type: true,
} as const;

const matterListInclude = {
  assignedTo: { select: userSelect },
  jurisdictions: {
    orderBy: { countryCode: 'asc' as const },
    select: {
      id: true,
      countryCode: true,
      localRefNumber: true,
      status: true,
    },
  },
  client: {
    select: clientPartySelect,
  },
  applicantClient: {
    select: clientPartySelect,
  },
  intermediaryClient: {
    select: clientPartySelect,
  },
} satisfies Prisma.MatterInclude;

const trademarkListInclude = {
  ...matterListInclude,
  attributes: { select: { attributes: true } },
  ipRights: {
    orderBy: { createdAt: 'asc' as const },
    take: 1,
    select: {
      applicationNumber: true,
      registrationNumber: true,
      filingDate: true,
      registrationDate: true,
    },
  },
} satisfies Prisma.MatterInclude;

const matterDetailInclude = {
  ...matterListInclude,
  filedBy: { select: userSelect },
  attributes: true,
  ipRights: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.MatterInclude;

export type IntakeLeadForMatter = IntakeLead & {
  counterparties: Counterparty[];
};

const ipRightInclude = {
  filingDocumentVersion: {
    select: {
      id: true,
      version: true,
      fileName: true,
      document: { select: { id: true, displayName: true, category: true } },
    },
  },
} satisfies Prisma.IpRightInclude;

@Injectable()
export class MattersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deadlinesService: DeadlinesService,
    private readonly portalAccess: PortalAccessService,
    private readonly oppositionPdf: OppositionPdfService,
  ) {}

  async create(dto: CreateMatterDto, userId: string) {
    await this.assertClientExists(dto.clientId);
    if (dto.applicantClientId) {
      await this.assertClientExists(dto.applicantClientId);
    }
    if (dto.intermediaryClientId) {
      await this.assertClientExists(dto.intermediaryClientId);
    }

    if (dto.assignedToId) {
      await this.assertUserExists(dto.assignedToId);
    }

    const applicantClientId =
      dto.applicantClientId && dto.applicantClientId !== dto.clientId
        ? dto.applicantClientId
        : null;
    const intermediaryClientId =
      dto.intermediaryClientId && dto.intermediaryClientId !== dto.clientId
        ? dto.intermediaryClientId
        : null;

    const matter = await this.prisma.$transaction(async (tx) => {
      const created = await tx.matter.create({
        data: {
          clientId: dto.clientId,
          applicantClientId,
          intermediaryClientId,
          matterType: dto.matterType,
          title: dto.title,
          status: dto.status ?? MatterStatus.draft,
          assignedToId: dto.assignedToId,
          filedById: userId,
          description: dto.description,
          jurisdictions: dto.jurisdictions?.length
            ? {
                create: dto.jurisdictions.map((j) => ({
                  countryCode: j.countryCode.toUpperCase(),
                  localRefNumber: j.localRefNumber,
                  status: j.status,
                })),
              }
            : undefined,
          attributes: dto.attributes
            ? {
                create: { attributes: dto.attributes as Prisma.InputJsonValue },
              }
            : { create: { attributes: {} } },
        },
        include: matterDetailInclude,
      });

      return created;
    });

    await this.deadlinesService.generateInitialDeadlines(matter.id);

    return matter;
  }

  async createFromIntake(
    tx: Prisma.TransactionClient,
    lead: IntakeLeadForMatter,
    clientId: string,
    userId: string,
    parties?: {
      applicantClientId?: string | null;
      intermediaryClientId?: string | null;
      ownerClientId?: string;
    },
  ) {
    const matterType = mapIntakeMatterType(lead.matterType);
    const title = buildMatterTitle(lead);
    const attributes = buildMatterAttributesFromIntake(lead);
    const jurisdiction = lead.country?.trim().toUpperCase();
    const applicantClientId =
      parties?.applicantClientId && parties.applicantClientId !== clientId
        ? parties.applicantClientId
        : null;
    const intermediaryClientId =
      parties?.intermediaryClientId && parties.intermediaryClientId !== clientId
        ? parties.intermediaryClientId
        : null;
    const ownerClientId =
      parties?.ownerClientId ?? applicantClientId ?? clientId;

    return tx.matter.create({
      data: {
        clientId,
        applicantClientId,
        intermediaryClientId,
        matterType,
        title,
        status: MatterStatus.active,
        assignedToId: lead.assignedUserId,
        filedById: userId,
        description: lead.description,
        sourceIntakeId: lead.id,
        jurisdictions: jurisdiction
          ? {
              create: [{ countryCode: jurisdiction }],
            }
          : undefined,
        attributes: {
          create: { attributes: attributes as Prisma.InputJsonValue },
        },
        ipRights:
          jurisdiction && INTAKE_TYPES_WITH_DRAFT_IP_RIGHT.has(lead.matterType)
            ? {
                create: [
                  {
                    clientId,
                    ownerClientId,
                    rightType: matterType,
                    title,
                    jurisdiction,
                    status: IpRightStatus.pending,
                  },
                ],
              }
            : undefined,
      },
      include: matterDetailInclude,
    });
  }

  async findAll(query: MatterQueryDto, user: AuthenticatedUser) {
    const limit = parseLimit(query.limit, 20);
    const page = parsePage(query.page);
    const skip = (page - 1) * limit;
    const search = query.search?.trim();

    const scopeClientId = this.portalAccess.requireScopeClientId(user);

    let statusFilter: Prisma.MatterWhereInput['status'] = query.status;
    if (query.draftsOnly) {
      statusFilter = MatterStatus.draft;
    } else if (query.status) {
      statusFilter = query.status;
    } else {
      // Draft create-files stay on the Drafts shelf until partner approval (status → active).
      statusFilter = { not: MatterStatus.draft };
    }

    const baseWhere: Prisma.MatterWhereInput = {
      clientId: scopeClientId ?? query.clientId,
      status: statusFilter,
      matterType: query.matterType
        ? query.matterType
        : query.matterTypes?.length
          ? { in: query.matterTypes }
          : undefined,
      assignedToId: query.assignedToId,
      isArchived: query.archivedOnly === true,
      ...(query.trademarkProcedure
        ? trademarkProcedureFilter(query.trademarkProcedure)
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              {
                client: {
                  OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { internalCode: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
              {
                jurisdictions: {
                  some: {
                    localRefNumber: { contains: search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const isTrademarkList =
      query.matterType === MatterType.trademark ||
      Boolean(query.trademarkProcedure);

    const trademarkPortfolioFilter = isTrademarkList
      ? trademarkListFilterWhere(query)
      : undefined;

    const where: Prisma.MatterWhereInput = trademarkPortfolioFilter
      ? { AND: [baseWhere, trademarkPortfolioFilter] }
      : baseWhere;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.matter.count({ where }),
      this.prisma.matter.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: isTrademarkList ? trademarkListInclude : matterListInclude,
      }),
    ]);

    const pageCount = total === 0 ? 0 : Math.ceil(total / limit);

    const matterIds = rows.map((m) => m.id);

    const [upcomingCounts, openDeadlineSummaries, documentCounts] =
      await Promise.all([
      this.deadlinesService.countUpcomingByMatterIds(matterIds),
      isTrademarkList
        ? this.deadlinesService.summarizeOpenByMatterIds(matterIds)
        : Promise.resolve(new Map()),
      isTrademarkList && matterIds.length > 0
        ? this.prisma.matterDocument.groupBy({
            by: ['matterId'],
            where: { matterId: { in: matterIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
    ]);

    const documentCountByMatterId = new Map<string, number>();
    for (const row of documentCounts) {
      documentCountByMatterId.set(row.matterId, row._count._all);
    }

    return {
      items: rows.map((m) => {
        const deadlineSummary = openDeadlineSummaries.get(m.id);
        const base = {
          ...m,
          upcomingDeadlineCount: upcomingCounts.get(m.id) ?? 0,
          openDeadlineCount: deadlineSummary?.openCount ?? 0,
          overdueDeadlineCount: deadlineSummary?.overdueCount ?? 0,
          nextDeadlineDueDate: deadlineSummary?.nextDueDate ?? null,
        };

        if (!isTrademarkList) {
          const { attributes: _a, ipRights: _i, ...rest } = base as typeof base & {
            attributes?: unknown
            ipRights?: unknown
          };
          return rest;
        }

        const row = m as typeof m & {
          attributes: { attributes: unknown } | null
          ipRights: Array<{
            applicationNumber: string | null
            registrationNumber: string | null
            filingDate: Date | null
            registrationDate: Date | null
          }>
        };

        const trademarkSummary = extractTrademarkListSummary(
          row.attributes?.attributes ?? null,
          row.ipRights[0] ?? null,
        );

        const {
          attributes: _attributes,
          ipRights: _ipRights,
          ...matterFields
        } = base as typeof base & {
          attributes?: unknown
          ipRights?: unknown
        };

        return {
          ...matterFields,
          trademarkSummary,
          documentCount: documentCountByMatterId.get(m.id) ?? 0,
        };
      }),
      total,
      page,
      limit,
      pageCount,
      nextCursor: null,
    };
  }

  /**
   * Sidebar shelf totals: non-archived non-draft by type, plus Drafts, Others, Archived.
   */
  async shelfCounts(user: AuthenticatedUser) {
    const scopeClientId = this.portalAccess.requireScopeClientId(user);
    const scope: Prisma.MatterWhereInput = {
      clientId: scopeClientId ?? undefined,
    };

    const primaryTypes = new Set([
      'trademark',
      'patent',
      'utility_model',
      'industrial_design',
      'geographical_indication',
      'cases',
    ]);

    const activeScope: Prisma.MatterWhereInput = {
      ...scope,
      isArchived: false,
      status: { not: MatterStatus.draft },
    };

    const [byTypeRows, all, archived, drafts, trademarkAttrs] =
      await Promise.all([
      this.prisma.matter.groupBy({
        by: ['matterType'],
        where: activeScope,
        _count: { _all: true },
      }),
      this.prisma.matter.count({
        where: activeScope,
      }),
      this.prisma.matter.count({
        where: { ...scope, isArchived: true },
      }),
      this.prisma.matter.count({
        where: {
          ...scope,
          isArchived: false,
          status: MatterStatus.draft,
        },
      }),
      this.prisma.matter.findMany({
        where: { ...activeScope, matterType: MatterType.trademark },
        select: { attributes: { select: { attributes: true } } },
      }),
    ]);

    const trademarkByProcedure: Record<string, number> = {};
    for (const row of trademarkAttrs) {
      const stored = readTrademarkProcedureFromAttributes(
        row.attributes?.attributes,
      );
      const key = normalizeTrademarkProcedureShelfKey(stored) ?? 'unknown';
      trademarkByProcedure[key] = (trademarkByProcedure[key] ?? 0) + 1;
    }
    trademarkByProcedure.marks =
      (trademarkByProcedure.new ?? 0) + (trademarkByProcedure.registered ?? 0);

    const byType: Record<string, number> = {};
    let others = 0;
    for (const row of byTypeRows) {
      byType[row.matterType] = row._count._all;
      if (!primaryTypes.has(row.matterType)) {
        others += row._count._all;
      }
    }

    return { all, archived, others, drafts, byType, trademarkByProcedure };
  }

  async listDeadlines(matterId: string, user: AuthenticatedUser) {
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.deadlinesService.listForMatter(matterId);
  }

  async tabCounts(matterId: string, user: AuthenticatedUser) {
    await this.portalAccess.assertMatterAccess(matterId, user);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openDeadlineStatuses: DeadlineStatus[] = [
      DeadlineStatus.pending,
      DeadlineStatus.in_progress,
      DeadlineStatus.escalated,
    ];

    const [
      documents,
      correspondence,
      correspondenceNew,
      deadlines,
      deadlinesOverdue,
      tasks,
      billing,
      ipRights,
      timeline,
      instructions,
      approvals,
      customsSeizures,
      customsApplications,
      matterAttributes,
    ] = await Promise.all([
      this.prisma.matterDocument.count({ where: { matterId } }),
      this.prisma.correspondence.count({ where: { matterId } }),
      this.prisma.correspondence.count({
        where: {
          matterId,
          direction: CorrespondenceDirection.incoming,
          status: CorrespondenceStatus.received,
        },
      }),
      this.prisma.deadline.count({
        where: { matterId, status: { in: openDeadlineStatuses } },
      }),
      this.prisma.deadline.count({
        where: {
          matterId,
          status: { in: openDeadlineStatuses },
          dueDate: { lt: today },
        },
      }),
      this.prisma.task.count({
        where: { matterId, status: TaskStatus.pending },
      }),
      this.prisma.invoice.count({
        where: {
          matterId,
          status: InvoiceStatus.issued,
          paymentStatus: { in: [PaymentStatus.unpaid, PaymentStatus.partial] },
        },
      }),
      this.prisma.ipRight.count({ where: { matterId } }),
      this.prisma.matterTimelineEvent.count({ where: { matterId } }),
      this.prisma.partnerInstruction.count({
        where: {
          matterId,
          status: { not: PartnerInstructionStatus.complete },
        },
      }),
      this.prisma.clientApprovalRequest.count({
        where: { matterId, status: ClientApprovalStatus.pending },
      }),
      this.prisma.customsSeizure.count({ where: { matterId } }),
      this.prisma.customsApplication.count({ where: { matterId } }),
      this.prisma.matterAttributes.findUnique({
        where: { matterId },
        select: { attributes: true },
      }),
    ]);

    return {
      documents,
      correspondence,
      correspondenceNew,
      deadlines,
      deadlinesOverdue,
      tasks,
      billing,
      ipRights,
      timeline,
      instructions,
      approvals,
      customs: customsSeizures + customsApplications,
      secondaryActions: countSecondaryTrademarkActions(
        matterAttributes?.attributes,
      ),
    };
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    if (user) {
      await this.portalAccess.assertMatterAccess(id, user);
    }
    const matter = await this.prisma.matter.findUnique({
      where: { id },
      include: matterDetailInclude,
    });
    if (!matter) throw new NotFoundException('Matter not found');
    return matter;
  }

  async getOppositionPdfDownload(
    id: string,
    user: AuthenticatedUser,
    lang?: string,
  ) {
    const matter = await this.findOne(id, user);
    const resolvedLang: OppositionPdfLang = lang === 'bg' ? 'bg' : 'en';
    return this.oppositionPdf.generateDownload(matter, resolvedLang);
  }

  async update(id: string, dto: UpdateMatterDto, user: AuthenticatedUser) {
    const matter = await this.findOne(id);

    if (
      dto.status &&
      (dto.status === MatterStatus.closed ||
        dto.status === MatterStatus.abandoned)
    ) {
      const canClose = user.roles.some((r) =>
        (MATTER_CLOSE_ROLES as readonly string[]).includes(r),
      );
      if (!canClose) {
        throw new ForbiddenException(
          'Only managing partners and IP attorneys can close or abandon matters',
        );
      }
    }

    if (dto.assignedToId) {
      await this.assertUserExists(dto.assignedToId);
    }
    if (dto.applicantClientId) {
      await this.assertClientExists(dto.applicantClientId);
    }
    if (dto.intermediaryClientId) {
      await this.assertClientExists(dto.intermediaryClientId);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.jurisdictions) {
        await tx.matterJurisdiction.deleteMany({ where: { matterId: id } });
        if (dto.jurisdictions.length > 0) {
          await tx.matterJurisdiction.createMany({
            data: dto.jurisdictions.map((j) => ({
              matterId: id,
              countryCode: j.countryCode.toUpperCase(),
              localRefNumber: j.localRefNumber,
              status: j.status,
            })),
          });
        }
      }

      if (dto.attributes !== undefined) {
        await tx.matterAttributes.upsert({
          where: { matterId: id },
          create: {
            matterId: id,
            attributes: dto.attributes as Prisma.InputJsonValue,
          },
          update: { attributes: dto.attributes as Prisma.InputJsonValue },
        });
      }

      return tx.matter.update({
        where: { id },
        data: {
          matterType: dto.matterType,
          title: dto.title,
          status: dto.status,
          assignedToId: dto.assignedToId,
          description: dto.description,
          ...(dto.applicantClientId !== undefined
            ? {
                applicantClientId:
                  dto.applicantClientId &&
                  dto.applicantClientId !== matter.clientId
                    ? dto.applicantClientId
                    : null,
              }
            : {}),
          ...(dto.intermediaryClientId !== undefined
            ? {
                intermediaryClientId:
                  dto.intermediaryClientId &&
                  dto.intermediaryClientId !== matter.clientId
                    ? dto.intermediaryClientId
                    : null,
              }
            : {}),
        },
        include: matterDetailInclude,
      });
    });
  }

  async archive(id: string, userId: string) {
    const matter = await this.findOne(id);
    if (matter.isArchived) return matter;

    return this.prisma.matter.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        archivedById: userId,
      },
      include: matterDetailInclude,
    });
  }

  async restore(id: string) {
    const matter = await this.findOne(id);
    if (!matter.isArchived) return matter;

    return this.prisma.matter.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null,
        archivedById: null,
      },
      include: matterDetailInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.matter.delete({ where: { id } });
    return { deleted: true };
  }

  async listIpRights(matterId: string, user: AuthenticatedUser) {
    await this.findOne(matterId, user);
    return this.prisma.ipRight.findMany({
      where: { matterId },
      orderBy: { createdAt: 'desc' },
      include: ipRightInclude,
    });
  }

  async createIpRight(matterId: string, dto: CreateIpRightDto) {
    const matter = await this.findOne(matterId);
    const ownerClientId =
      dto.ownerClientId ?? matter.applicantClientId ?? matter.clientId;
    if (dto.ownerClientId) {
      await this.assertClientExists(dto.ownerClientId);
    }

    return this.prisma.ipRight.create({
      data: {
        matterId,
        clientId: matter.clientId,
        ownerClientId,
        rightType: dto.rightType,
        title: dto.title,
        applicationNumber: dto.applicationNumber,
        registrationNumber: dto.registrationNumber,
        filingDate: dto.filingDate ? new Date(dto.filingDate) : null,
        registrationDate: dto.registrationDate
          ? new Date(dto.registrationDate)
          : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        jurisdiction: dto.jurisdiction.toUpperCase(),
        status: dto.status,
        attributes: dto.attributes as Prisma.InputJsonValue | undefined,
      },
      include: ipRightInclude,
    });
  }

  async fileIpRight(
    matterId: string,
    ipRightId: string,
    dto: FileIpRightDto,
    userId: string,
  ) {
    await this.findOne(matterId);

    const existing = await this.prisma.ipRight.findFirst({
      where: { id: ipRightId, matterId },
    });
    if (!existing) {
      throw new NotFoundException('IP right not found on this matter');
    }
    if (existing.status !== IpRightStatus.pending) {
      throw new BadRequestException(
        'Only IP rights pending filing can be filed',
      );
    }

    await this.assertDocumentVersionOnMatter(matterId, dto.documentVersionId);

    const jurisdiction = (
      dto.jurisdiction ?? existing.jurisdiction
    ).toUpperCase();
    const filingDate = new Date(dto.filingDate);
    const applicationNumber = dto.applicationNumber.trim();
    const authority = filingAuthorityForJurisdiction(jurisdiction);

    const updated = await this.prisma.$transaction(async (tx) => {
      const filed = await tx.ipRight.update({
        where: { id: ipRightId },
        data: {
          status: IpRightStatus.filed,
          applicationNumber,
          filingDate,
          jurisdiction,
          filingDocumentVersionId: dto.documentVersionId,
        },
        include: ipRightInclude,
      });

      await tx.matterJurisdiction.upsert({
        where: {
          matterId_countryCode: { matterId, countryCode: jurisdiction },
        },
        create: {
          matterId,
          countryCode: jurisdiction,
          status: MatterJurisdictionStatus.filed,
          localRefNumber: applicationNumber,
        },
        update: {
          status: MatterJurisdictionStatus.filed,
          localRefNumber: applicationNumber,
        },
      });

      await tx.matter.update({
        where: { id: matterId },
        data: { filedById: userId },
      });

      await tx.matterTimelineEvent.create({
        data: {
          matterId,
          eventType: MatterTimelineEventType.filing,
          title: filingTimelineTitle(jurisdiction, applicationNumber),
          description: `Filing package linked. Authority: ${authority}.`,
          occurredAt: filingDate,
          sourceIpRightId: filed.id,
          createdById: userId,
          metadata: {
            ipRightId: filed.id,
            applicationNumber,
            jurisdiction,
            authority,
            documentVersionId: dto.documentVersionId,
            filingDate: dto.filingDate,
          },
        },
      });

      return filed;
    });

    await this.deadlinesService.generateDeadlinesFromFiling(matterId, {
      jurisdiction,
      filingDate,
      userId,
      ipRightId: updated.id,
    });

    return updated;
  }

  private async assertClientExists(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client not found');
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Assigned user not found');
  }

  private async assertDocumentVersionOnMatter(
    matterId: string,
    documentVersionId: string,
  ) {
    const version = await this.prisma.matterDocumentVersion.findFirst({
      where: {
        id: documentVersionId,
        document: { matterId },
      },
      select: { id: true },
    });
    if (!version) {
      throw new BadRequestException(
        'Document version not found on this matter',
      );
    }
  }
}
