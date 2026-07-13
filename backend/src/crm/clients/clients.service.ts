import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientStatus,
  ClientType,
  Prisma,
  RelationshipEventType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { clientDisplayName } from '../crm.utils';
import { parseLimit } from '../dto/pagination.dto';
import { HistoryService } from '../history/history.service';
import {
  ClientQueryDto,
  CreateClientDto,
  UpdateClientDto,
} from './dto/client.dto';

const clientInclude = {
  assignedUser: { select: { id: true, fullName: true, email: true } },
  holdingGroup: { select: { id: true, name: true } },
  offices: { orderBy: { isPrimary: 'desc' as const } },
  contacts: {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' as const },
  },
  relatedCompanies: {
    include: {
      relatedClient: {
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
} satisfies Prisma.ClientInclude;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: HistoryService,
  ) {}

  async create(dto: CreateClientDto, userId?: string) {
    this.validateClientFields(dto.type, dto);

    const client = await this.prisma.$transaction(async (tx) =>
      this.createInTransaction(tx, dto),
    );

    await this.history.log({
      clientId: client.id,
      userId,
      eventType: RelationshipEventType.created,
      description: `Client created (${client.internalCode})`,
      metadata: { internalCode: client.internalCode, type: dto.type },
    });

    return client;
  }

  async createInTransaction(tx: Prisma.TransactionClient, dto: CreateClientDto) {
    this.validateClientFields(dto.type, dto);
    const internalCode = await this.generateInternalCode(tx);
    const gdprConsent = dto.gdprConsent ?? false;

    return tx.client.create({
      data: {
        type: dto.type,
        status: dto.status ?? ClientStatus.active,
        companyName: dto.companyName,
        registrationNo: dto.registrationNo,
        vatNo: dto.vatNo,
        legalForm: dto.legalForm,
        firstName: dto.firstName,
        lastName: dto.lastName,
        country: dto.country,
        website: dto.website,
        internalCode,
        assignedUserId: dto.assignedUserId,
        holdingGroupId: dto.holdingGroupId,
        notes: dto.notes,
        gdprConsent,
        gdprConsentDate: gdprConsent ? new Date() : null,
      },
      include: clientInclude,
    });
  }

  async findAll(query: ClientQueryDto) {
    const take = parseLimit(query.limit);
    const search = query.search?.trim();

    const where: Prisma.ClientWhereInput = {
      status: query.status ?? { not: ClientStatus.archived },
      type: query.type,
      assignedUserId: query.assignedUserId,
      holdingGroupId: query.holdingGroupId,
      ...(query.gdprConsent !== undefined
        ? { gdprConsent: query.gdprConsent }
        : {}),
      ...(search
        ? {
            OR: [
              { internalCode: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        type: true,
        status: true,
        internalCode: true,
        companyName: true,
        firstName: true,
        lastName: true,
        country: true,
        gdprConsent: true,
        gdprConsentDate: true,
        createdAt: true,
        assignedUser: { select: { id: true, fullName: true } },
        holdingGroup: { select: { id: true, name: true } },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items: items.map((c) => ({
        ...c,
        displayName: clientDisplayName(c),
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: clientInclude,
    });
    if (!client) throw new NotFoundException('Client not found');
    return { ...client, displayName: clientDisplayName(client) };
  }

  async getSummary(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: {
          where: { isActive: true, role: 'primary' },
          take: 1,
        },
        offices: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    return {
      id: client.id,
      internalCode: client.internalCode,
      displayName: clientDisplayName(client),
      status: client.status,
      type: client.type,
      country: client.country,
      primaryContact: client.contacts[0] ?? null,
      primaryOffice: client.offices[0] ?? null,
    };
  }

  async update(id: string, dto: UpdateClientDto, userId?: string) {
    const existing = await this.findOne(id);
    if (existing.status === ClientStatus.archived) {
      throw new BadRequestException('Archived clients cannot be updated');
    }

    const type = existing.type;
    const merged = {
      companyName: dto.companyName ?? existing.companyName,
      firstName: dto.firstName ?? existing.firstName,
      lastName: dto.lastName ?? existing.lastName,
    };
    this.validateClientFields(type, merged);

    const gdprConsent =
      dto.gdprConsent !== undefined ? dto.gdprConsent : existing.gdprConsent;
    const gdprConsentDate =
      dto.gdprConsent === true && !existing.gdprConsent
        ? new Date()
        : dto.gdprConsent === false
          ? null
          : existing.gdprConsentDate;

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...dto,
        gdprConsent,
        gdprConsentDate,
      },
      include: clientInclude,
    });

    if (dto.status && dto.status !== existing.status) {
      await this.history.log({
        clientId: id,
        userId,
        eventType: RelationshipEventType.status_changed,
        description: `Status changed to ${dto.status}`,
        metadata: { from: existing.status, to: dto.status },
      });
    }

    if (
      dto.holdingGroupId !== undefined &&
      dto.holdingGroupId !== existing.holdingGroupId
    ) {
      await this.history.log({
        clientId: id,
        userId,
        eventType: RelationshipEventType.holding_changed,
        description: 'Holding group assignment updated',
        metadata: {
          from: existing.holdingGroupId,
          to: dto.holdingGroupId,
        },
      });
    }

    return { ...client, displayName: clientDisplayName(client) };
  }

  async archive(id: string, userId?: string) {
    const existing = await this.findOne(id);
    if (existing.status === ClientStatus.archived) {
      return existing;
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: { status: ClientStatus.archived },
      include: clientInclude,
    });

    await this.history.log({
      clientId: id,
      userId,
      eventType: RelationshipEventType.status_changed,
      description: 'Client archived',
      metadata: { from: existing.status, to: ClientStatus.archived },
    });

    return { ...client, displayName: clientDisplayName(client) };
  }

  async ensureWritableClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, status: true },
    });
    if (!client) throw new NotFoundException('Client not found');
    if (client.status === ClientStatus.archived) {
      throw new BadRequestException('Client is archived');
    }
    return client;
  }

  private validateClientFields(
    type: ClientType,
    fields: {
      companyName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    },
  ) {
    if (type === ClientType.company && !fields.companyName?.trim()) {
      throw new BadRequestException('companyName is required for company clients');
    }
    if (type === ClientType.individual) {
      if (!fields.firstName?.trim() || !fields.lastName?.trim()) {
        throw new BadRequestException(
          'firstName and lastName are required for individual clients',
        );
      }
    }
  }

  private async generateInternalCode(tx: Prisma.TransactionClient) {
    const year = new Date().getFullYear();
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`client-code-${year}`}))`;

    const prefix = `CL-${year}-`;
    const latest = await tx.client.findFirst({
      where: { internalCode: { startsWith: prefix } },
      orderBy: { internalCode: 'desc' },
      select: { internalCode: true },
    });

    let next = 1;
    if (latest?.internalCode) {
      const suffix = latest.internalCode.slice(prefix.length);
      const parsed = Number.parseInt(suffix, 10);
      if (!Number.isNaN(parsed)) next = parsed + 1;
    }

    return `${prefix}${String(next).padStart(3, '0')}`;
  }
}
