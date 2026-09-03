import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientStatus,
  ClientType,
  DeadlineStatus,
  Prisma,
  RelationshipEventType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { clientDisplayName } from '../crm.utils';
import { parseLimit, parsePage } from '../dto/pagination.dto';
import { HistoryService } from '../history/history.service';
import {
  CLIENT_OFFICE_ADDRESS_TYPE,
  createTypedClientAddressesInTransaction,
} from '../offices/client-office-address.util';
import {
  compareAddresses,
  formatAddress,
  hasAddressContent,
  type AddressParts,
} from '../address/address-compare.util';
import type { RegistryApplicantSnapshot } from '../../registry/registry-address.types';
import {
  ClientQueryDto,
  ClientSortBy,
  CreateClientDto,
  SortOrder,
  UpdateClientDto,
} from './dto/client.dto';
import { assessBillingReadiness } from './client-billing.utils';
import {
  EMPTY_CLIENT_TAB_COUNTS,
  loadClientTabCounts,
} from './client-tab-counts';

function buildClientOrderBy(
  sortBy: ClientSortBy,
  sortOrder: SortOrder,
): Prisma.ClientOrderByWithRelationInput[] {
  const dir = sortOrder;
  switch (sortBy) {
    case ClientSortBy.name:
      return [
        { companyName: dir },
        { lastName: dir },
        { firstName: dir },
        { id: dir },
      ];
    case ClientSortBy.internalCode:
      return [{ internalCode: dir }, { id: dir }];
    case ClientSortBy.updatedAt:
      return [{ updatedAt: dir }, { id: dir }];
    case ClientSortBy.createdAt:
    default:
      return [{ createdAt: dir }, { id: dir }];
  }
}

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

    const client = await tx.client.create({
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
        billingName: dto.billingName?.trim() || null,
        billingEmail: dto.billingEmail?.trim().toLowerCase() || null,
        preferredCurrency: dto.preferredCurrency?.toUpperCase() || 'EUR',
        paymentTermsDays: dto.paymentTermsDays ?? 30,
        billingAddressLine1: dto.billingAddressLine1?.trim() || null,
        billingAddressLine2: dto.billingAddressLine2?.trim() || null,
        billingCity: dto.billingCity?.trim() || null,
        billingRegion: dto.billingRegion?.trim() || null,
        billingPostalCode: dto.billingPostalCode?.trim() || null,
        billingCountry: dto.billingCountry?.trim() || null,
      },
      include: clientInclude,
    });

    await createTypedClientAddressesInTransaction(
      tx,
      client.id,
      dto.registeredLegalAddress,
      dto.correspondenceAddress,
    );

    return tx.client.findUniqueOrThrow({
      where: { id: client.id },
      include: clientInclude,
    });
  }

  async findAll(query: ClientQueryDto) {
    const limit = parseLimit(query.limit, 20);
    const page = parsePage(query.page);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? ClientSortBy.createdAt;
    const sortOrder = query.sortOrder ?? SortOrder.desc;
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

    const orderBy = buildClientOrderBy(sortBy, sortOrder);

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.client.count({ where }),
      this.prisma.client.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          updatedAt: true,
          assignedUser: { select: { id: true, fullName: true } },
          holdingGroup: { select: { id: true, name: true } },
        },
      }),
    ]);

    const pageCount = total === 0 ? 0 : Math.ceil(total / limit);
    const tabCounts = await loadClientTabCounts(
      this.prisma,
      rows.map((c) => c.id),
    );

    return {
      items: rows.map((c) => ({
        ...c,
        displayName: clientDisplayName(c),
        tabCounts: tabCounts.get(c.id) ?? { ...EMPTY_CLIENT_TAB_COUNTS },
      })),
      total,
      page,
      limit,
      pageCount,
      nextCursor: null,
    };
  }

  async tabCounts(id: string) {
    const exists = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Client not found');
    const counts = await loadClientTabCounts(this.prisma, [id]);
    return counts.get(id) ?? { ...EMPTY_CLIENT_TAB_COUNTS };
  }

  async listDeadlines(id: string) {
    const exists = await this.prisma.client.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Client not found');
    return this.prisma.deadline.findMany({
      where: {
        matter: { clientId: id },
        status: { not: DeadlineStatus.superseded },
      },
      orderBy: [{ dueDate: 'asc' }],
      include: {
        assignedTo: { select: { id: true, fullName: true, email: true } },
        rule: {
          select: {
            id: true,
            jurisdiction: true,
            eventType: true,
            triggerType: true,
            daysOffset: true,
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
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: clientInclude,
    });
    if (!client) throw new NotFoundException('Client not found');
    return {
      ...client,
      displayName: clientDisplayName(client),
      billingReadiness: assessBillingReadiness(client),
    };
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
          where: {
            addressType: {
              in: [
                CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
                CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
                CLIENT_OFFICE_ADDRESS_TYPE.branch,
              ],
            },
          },
          orderBy: [{ addressType: 'asc' }, { isPrimary: 'desc' }],
        },
      },
    });
    if (!client) throw new NotFoundException('Client not found');

    const registeredLegalOffice = client.offices.find(
      (office) =>
        office.addressType === CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
    );
    const correspondenceOffice = client.offices.find(
      (office) =>
        office.addressType === CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
    );
    const registeredVsCorrespondence = compareAddresses(
      registeredLegalOffice,
      correspondenceOffice,
    );
    const primaryOffice =
      registeredLegalOffice ??
      client.offices.find((office) => office.isPrimary) ??
      client.offices[0] ??
      null;

    return {
      id: client.id,
      internalCode: client.internalCode,
      displayName: clientDisplayName(client),
      status: client.status,
      type: client.type,
      country: client.country,
      primaryContact: client.contacts[0] ?? null,
      primaryOffice,
      registeredLegalOffice: registeredLegalOffice ?? null,
      correspondenceOffice: correspondenceOffice ?? null,
      addressesDiffer:
        registeredVsCorrespondence.match === 'mismatch' ||
        registeredVsCorrespondence.match === 'partial',
    };
  }

  async getAddressInsights(id: string) {
    await this.findOne(id);

    const offices = await this.prisma.clientOffice.findMany({
      where: { clientId: id },
      orderBy: [{ addressType: 'asc' }, { isPrimary: 'desc' }],
    });

    const registeredLegalOffice = offices.find(
      (office) =>
        office.addressType === CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
    );
    const correspondenceOffice = offices.find(
      (office) =>
        office.addressType === CLIENT_OFFICE_ADDRESS_TYPE.correspondence,
    );

    const registeredVsCorrespondence = compareAddresses(
      registeredLegalOffice,
      correspondenceOffice,
    );

    const ipRights = await this.prisma.ipRight.findMany({
      where: { clientId: id },
      select: {
        id: true,
        matterId: true,
        title: true,
        applicationNumber: true,
        registrationNumber: true,
        jurisdiction: true,
        attributes: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });

    const ipAssetComparisons = ipRights
      .map((right) => {
        const attrs = (right.attributes ?? {}) as {
          registryApplicant?: RegistryApplicantSnapshot;
        };
        const registryApplicant = attrs.registryApplicant ?? null;
        const registryAddress = registryApplicant?.address ?? null;
        const comparisonToRegisteredLegal = compareAddresses(
          registeredLegalOffice,
          registryAddress,
        );

        return {
          ipRightId: right.id,
          matterId: right.matterId,
          title: right.title,
          applicationNumber: right.applicationNumber,
          registrationNumber: right.registrationNumber,
          jurisdiction: right.jurisdiction,
          registryApplicant,
          comparisonToRegisteredLegal,
        };
      })
      .filter(
        (row) =>
          row.registryApplicant?.address &&
          hasAddressContent(row.registryApplicant.address),
      );

    const mismatchCount =
      (registeredVsCorrespondence.match === 'mismatch' ? 1 : 0) +
      ipAssetComparisons.filter(
        (row) =>
          row.comparisonToRegisteredLegal.match === 'mismatch' ||
          row.comparisonToRegisteredLegal.match === 'partial',
      ).length;

    return {
      registeredLegalAddress: this.toAddressPayload(registeredLegalOffice),
      correspondenceAddress: this.toAddressPayload(correspondenceOffice),
      registeredLegalFormatted: formatAddress(registeredLegalOffice),
      correspondenceFormatted: formatAddress(correspondenceOffice),
      registeredVsCorrespondence,
      ipAssetComparisons,
      hasAddressMismatch: mismatchCount > 0,
      mismatchCount,
    };
  }

  private toAddressPayload(
    office: {
      addressLine1: string | null;
      addressLine2: string | null;
      city: string | null;
      region: string | null;
      postalCode: string | null;
      country: string | null;
      phone: string | null;
      fax: string | null;
    } | null | undefined,
  ): AddressParts & { phone?: string | null; fax?: string | null } | null {
    if (!office) return null;
    return {
      addressLine1: office.addressLine1,
      addressLine2: office.addressLine2,
      city: office.city,
      region: office.region,
      postalCode: office.postalCode,
      country: office.country,
      phone: office.phone,
      fax: office.fax,
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
        billingEmail:
          dto.billingEmail === undefined
            ? undefined
            : dto.billingEmail?.trim().toLowerCase() || null,
        preferredCurrency:
          dto.preferredCurrency === undefined
            ? undefined
            : dto.preferredCurrency.toUpperCase(),
        billingName:
          dto.billingName === undefined
            ? undefined
            : dto.billingName?.trim() || null,
        billingAddressLine1:
          dto.billingAddressLine1 === undefined
            ? undefined
            : dto.billingAddressLine1?.trim() || null,
        billingAddressLine2:
          dto.billingAddressLine2 === undefined
            ? undefined
            : dto.billingAddressLine2?.trim() || null,
        billingCity:
          dto.billingCity === undefined
            ? undefined
            : dto.billingCity?.trim() || null,
        billingRegion:
          dto.billingRegion === undefined
            ? undefined
            : dto.billingRegion?.trim() || null,
        billingPostalCode:
          dto.billingPostalCode === undefined
            ? undefined
            : dto.billingPostalCode?.trim() || null,
        billingCountry:
          dto.billingCountry === undefined
            ? undefined
            : dto.billingCountry?.trim() || null,
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

    return {
      ...client,
      displayName: clientDisplayName(client),
      billingReadiness: assessBillingReadiness(client),
    };
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
