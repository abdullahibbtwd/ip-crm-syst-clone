import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientType,
  ConflictCheckResult,
  ConflictResolution,
  ContactRole,
  IntakeEnquirerType,
  IntakeStatus,
  Prisma,
  RelationshipEventType,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ClientsService } from '../crm/clients/clients.service';
import { HistoryService } from '../crm/history/history.service';
import { parseLimit } from '../crm/dto/pagination.dto';
import { MattersService } from '../matters/matters.service';
import { DeadlinesService } from '../deadlines/deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckService } from './conflict-check.service';
import {
  ConvertIntakeDto,
  CreateCounterpartyDto,
  CreateIntakeLeadDto,
  IntakeQueryDto,
  ResolveConflictDto,
  UpdateIntakeLeadDto,
} from './dto/intake.dto';

const intakeInclude = {
  assignedUser: { select: { id: true, fullName: true, email: true } },
  createdBy: { select: { id: true, fullName: true, email: true } },
  convertedClient: {
    select: {
      id: true,
      internalCode: true,
      companyName: true,
      firstName: true,
      lastName: true,
      type: true,
    },
  },
  convertedMatter: {
    select: {
      id: true,
      title: true,
      matterType: true,
      status: true,
    },
  },
  conflictChecks: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    include: {
      resolvedBy: { select: { id: true, fullName: true } },
    },
  },
  counterparties: {
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.IntakeLeadInclude;

@Injectable()
export class IntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictCheck: ConflictCheckService,
    private readonly clientsService: ClientsService,
    private readonly mattersService: MattersService,
    private readonly deadlinesService: DeadlinesService,
    private readonly history: HistoryService,
  ) {}

  async create(dto: CreateIntakeLeadDto, createdById: string) {
    this.validateEnquirer(dto.enquirerType, dto);
    if (!dto.email?.trim() && !dto.phone?.trim()) {
      throw new BadRequestException('Provide at least an email or phone number');
    }
    const counterparties = this.normalizeCounterparties(dto.counterparties);

    return this.prisma.intakeLead.create({
      data: {
        enquirerType: dto.enquirerType,
        companyName: dto.companyName,
        fullName: dto.fullName,
        country: dto.country,
        email: dto.email,
        phone: dto.phone,
        matterType: dto.matterType,
        description: dto.description,
        urgency: dto.urgency,
        referralSource: dto.referralSource,
        referredBy: dto.referredBy,
        assignedUserId: dto.assignedUserId,
        notes: dto.notes,
        createdById,
        status: IntakeStatus.new,
        ...(counterparties.length
          ? { counterparties: { create: counterparties } }
          : {}),
      },
      include: intakeInclude,
    });
  }

  async addCounterparty(intakeLeadId: string, dto: CreateCounterpartyDto) {
    const lead = await this.findOne(intakeLeadId);
    if (lead.status === IntakeStatus.converted) {
      throw new BadRequestException('Converted leads cannot be edited');
    }

    const [counterparty] = this.normalizeCounterparties([dto]);
    return this.prisma.counterparty.create({
      data: {
        intakeLeadId,
        ...counterparty,
      },
    });
  }

  async removeCounterparty(intakeLeadId: string, counterpartyId: string) {
    const lead = await this.findOne(intakeLeadId);
    if (lead.status === IntakeStatus.converted) {
      throw new BadRequestException('Converted leads cannot be edited');
    }

    const existing = await this.prisma.counterparty.findFirst({
      where: { id: counterpartyId, intakeLeadId },
    });
    if (!existing) throw new NotFoundException('Counterparty not found');

    await this.prisma.counterparty.delete({ where: { id: counterpartyId } });
    return this.findOne(intakeLeadId);
  }

  async findAll(query: IntakeQueryDto) {
    const take = parseLimit(query.limit);
    const search = query.search?.trim();

    const where: Prisma.IntakeLeadWhereInput = {
      status: query.status,
      ...(search
        ? {
            OR: [
              { companyName: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.intakeLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: intakeInclude,
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };
  }

  async findOne(id: string) {
    const lead = await this.prisma.intakeLead.findUnique({
      where: { id },
      include: {
        ...intakeInclude,
        conflictChecks: {
          orderBy: { createdAt: 'desc' },
          include: { resolvedBy: { select: { id: true, fullName: true } } },
        },
      },
    });
    if (!lead) throw new NotFoundException('Intake lead not found');
    return lead;
  }

  async update(id: string, dto: UpdateIntakeLeadDto) {
    const existing = await this.findOne(id);
    if (existing.status === IntakeStatus.converted) {
      throw new BadRequestException('Converted leads cannot be edited');
    }

    return this.prisma.intakeLead.update({
      where: { id },
      data: dto,
      include: intakeInclude,
    });
  }

  async runConflictCheck(id: string) {
    const lead = await this.findOne(id);
    if (lead.status === IntakeStatus.converted) {
      throw new BadRequestException('Lead is already converted');
    }
    if (lead.status === IntakeStatus.rejected) {
      throw new BadRequestException('Rejected leads cannot be checked');
    }

    const hits = await this.conflictCheck.runCheck({
      companyName: lead.companyName,
      fullName: lead.fullName,
      country: lead.country,
      email: lead.email,
      phone: lead.phone,
      description: lead.description,
      excludeIntakeLeadId: id,
      counterpartyTerms: lead.counterparties.map((cp) => ({
        name: cp.name,
        company: cp.company,
      })),
    });

    const flagged = hits.length > 0;
    const result = flagged ? ConflictCheckResult.flagged : ConflictCheckResult.clear;
    const resolution = flagged
      ? ConflictResolution.pending
      : ConflictResolution.approved;
    const nextStatus = flagged
      ? IntakeStatus.conflict_flagged
      : IntakeStatus.approved;

    await this.prisma.$transaction([
      this.prisma.intakeConflictCheck.create({
        data: {
          intakeLeadId: id,
          result,
          hits: hits as unknown as Prisma.InputJsonValue,
          resolution,
        },
      }),
      this.prisma.intakeLead.update({
        where: { id },
        data: { status: nextStatus },
      }),
    ]);

    return this.findOne(id);
  }

  async resolveConflict(id: string, dto: ResolveConflictDto, userId: string) {
    const lead = await this.findOne(id);
    if (lead.status !== IntakeStatus.conflict_flagged) {
      throw new BadRequestException('Lead is not awaiting conflict review');
    }

    const latest = lead.conflictChecks[0];
    if (!latest || latest.result !== ConflictCheckResult.flagged) {
      throw new BadRequestException('No flagged conflict check found');
    }

    const resolution =
      dto.decision === 'approved'
        ? ConflictResolution.approved
        : dto.decision === 'rejected'
          ? ConflictResolution.rejected
          : ConflictResolution.overridden;

    const nextStatus =
      dto.decision === 'rejected'
        ? IntakeStatus.rejected
        : IntakeStatus.approved;

    await this.prisma.$transaction([
      this.prisma.intakeConflictCheck.update({
        where: { id: latest.id },
        data: {
          resolution,
          resolvedById: userId,
          resolvedAt: new Date(),
          resolutionNote: dto.note,
        },
      }),
      this.prisma.intakeLead.update({
        where: { id },
        data: { status: nextStatus },
      }),
    ]);

    return this.findOne(id);
  }

  async convert(id: string, dto: ConvertIntakeDto, user: AuthenticatedUser) {
    const lead = await this.findOne(id);

    if (!user.permissions.includes('matter:create')) {
      throw new ForbiddenException(
        'You do not have permission to create matters from intake',
      );
    }

    if (lead.status === IntakeStatus.converted) {
      throw new BadRequestException('Lead is already converted');
    }
    if (lead.status !== IntakeStatus.approved) {
      throw new BadRequestException(
        'Lead must be approved before conversion. Run conflict check first.',
      );
    }
    if (!dto.gdprConsent) {
      throw new BadRequestException('GDPR consent is required to create a client');
    }

    const isCompany = lead.enquirerType === IntakeEnquirerType.company;
    const nameParts = lead.fullName?.trim().split(/\s+/).filter(Boolean) ?? [];

    const { client, matter } = await this.prisma.$transaction(async (tx) => {
      const createdClient = await this.clientsService.createInTransaction(tx, {
        type: isCompany ? ClientType.company : ClientType.individual,
        companyName: isCompany ? (lead.companyName ?? undefined) : undefined,
        firstName: isCompany ? undefined : (nameParts[0] ?? lead.fullName ?? undefined),
        lastName: isCompany
          ? undefined
          : (nameParts.length > 1 ? nameParts.slice(1).join(' ') : lead.fullName) ?? undefined,
        country: lead.country ?? undefined,
        assignedUserId: lead.assignedUserId ?? undefined,
        holdingGroupId: dto.holdingGroupId,
        notes: dto.notes ?? lead.notes ?? undefined,
        gdprConsent: true,
      });

      const createdMatter = await this.mattersService.createFromIntake(
        tx,
        lead,
        createdClient.id,
        user.userId,
      );

      await this.createPrimaryContactFromIntake(tx, lead, createdClient.id);

      await tx.intakeLead.update({
        where: { id },
        data: {
          status: IntakeStatus.converted,
          convertedClientId: createdClient.id,
          convertedMatterId: createdMatter.id,
        },
      });

      return { client: createdClient, matter: createdMatter };
    });

    await this.history.log({
      clientId: client.id,
      userId: user.userId,
      eventType: RelationshipEventType.created,
      description: `Client created (${client.internalCode}) from intake conversion`,
      metadata: {
        internalCode: client.internalCode,
        intakeLeadId: id,
        matterId: matter.id,
      },
    });

    await this.history.log({
      clientId: client.id,
      userId: user.userId,
      eventType: RelationshipEventType.note_added,
      description: `Intake converted to matter: ${matter.title}`,
      metadata: { intakeLeadId: id, matterId: matter.id },
    });

    await this.deadlinesService.generateInitialDeadlines(matter.id);

    return this.findOne(id);
  }

  private async createPrimaryContactFromIntake(
    tx: Prisma.TransactionClient,
    lead: {
      enquirerType: IntakeEnquirerType;
      companyName: string | null;
      fullName: string | null;
      email: string | null;
      phone: string | null;
    },
    clientId: string,
  ) {
    if (!lead.email?.trim() && !lead.phone?.trim()) return;

    const isCompany = lead.enquirerType === IntakeEnquirerType.company;
    let firstName: string;
    let lastName: string;

    if (isCompany) {
      firstName = 'Primary';
      lastName = 'Contact';
    } else {
      const parts = lead.fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
      firstName = parts[0] ?? 'Primary';
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0] ?? 'Contact';
    }

    await tx.contact.create({
      data: {
        clientId,
        role: ContactRole.primary,
        firstName,
        lastName,
        email: lead.email?.trim() || undefined,
        phone: lead.phone?.trim() || undefined,
      },
    });
  }

  private validateEnquirer(
    type: IntakeEnquirerType,
    dto: { companyName?: string; fullName?: string },
  ) {
    if (type === IntakeEnquirerType.company && !dto.companyName?.trim()) {
      throw new BadRequestException('Company name is required for company enquiries');
    }
    if (type === IntakeEnquirerType.individual && !dto.fullName?.trim()) {
      throw new BadRequestException('Full name is required for individual enquiries');
    }
  }

  private normalizeCounterparties(dtos?: CreateCounterpartyDto[]) {
    if (!dtos?.length) return [];

    return dtos.map((dto, index) => {
      const name = dto.name?.trim() || null;
      const company = dto.company?.trim() || null;
      if (!name && !company) {
        throw new BadRequestException(
          `Counterparty ${index + 1}: provide at least a name or company`,
        );
      }
      return {
        name,
        company,
        relationship: dto.relationship,
        notes: dto.notes?.trim() || null,
      };
    });
  }
}
