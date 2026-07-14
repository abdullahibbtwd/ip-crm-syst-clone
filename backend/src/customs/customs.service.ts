import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatterType } from '../../generated/prisma/client';
import { CustomsSeizureDeadlinesService } from '../deadlines/customs-seizure-deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateCustodyLogDto,
  CreateCustomsApplicationDto,
  CreateCustomsSeizureDto,
  UpdateCustomsApplicationDto,
  UpdateCustomsSeizureDto,
} from './dto/customs.dto';

const userSelect = { id: true, fullName: true, email: true } as const;

@Injectable()
export class CustomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seizureDeadlines: CustomsSeizureDeadlinesService,
  ) {}

  async listSeizures(matterId: string) {
    await this.assertBorderMeasuresMatter(matterId);
    const rows = await this.prisma.customsSeizure.findMany({
      where: { matterId },
      orderBy: [{ seizureDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: userSelect },
        linkedMatter: { select: { id: true, title: true, matterType: true } },
        _count: { select: { custodyLogs: true, applications: true } },
      },
    });
    return rows.map((row) => this.serializeSeizure(row));
  }

  async getSeizure(id: string) {
    const row = await this.prisma.customsSeizure.findUnique({
      where: { id },
      include: {
        createdBy: { select: userSelect },
        linkedMatter: { select: { id: true, title: true, matterType: true } },
        custodyLogs: {
          orderBy: [{ occurredAt: 'desc' }],
          include: {
            actorUser: { select: userSelect },
            documentVersion: {
              select: { id: true, fileName: true, documentId: true },
            },
          },
        },
        applications: {
          orderBy: [{ createdAt: 'desc' }],
          include: { createdBy: { select: userSelect } },
        },
      },
    });
    if (!row) throw new NotFoundException('Seizure not found');
    return {
      ...this.serializeSeizure(row),
      custodyLogs: row.custodyLogs.map((log) => ({
        id: log.id,
        action: log.action,
        occurredAt: log.occurredAt,
        notes: log.notes,
        actorUser: log.actorUser,
        documentVersion: log.documentVersion,
        createdAt: log.createdAt,
      })),
      applications: row.applications.map((app) => this.serializeApplication(app)),
    };
  }

  async createSeizure(
    matterId: string,
    dto: CreateCustomsSeizureDto,
    userId: string,
  ) {
    const matter = await this.assertBorderMeasuresMatter(matterId);
    const row = await this.prisma.customsSeizure.create({
      data: {
        matterId,
        clientId: matter.clientId,
        seizureDate: new Date(dto.seizureDate),
        customsOffice: dto.customsOffice.trim(),
        goodsDescription: dto.goodsDescription.trim(),
        consignmentReference: dto.consignmentReference?.trim() || null,
        quantity: dto.quantity?.trim() || null,
        portOfEntry: dto.portOfEntry?.trim() || null,
        createdById: userId,
      },
      include: {
        createdBy: { select: userSelect },
        linkedMatter: { select: { id: true, title: true, matterType: true } },
      },
    });

    await this.seizureDeadlines.generateFromSeizure(
      matterId,
      row.id,
      row.seizureDate,
      userId,
    );

    return this.serializeSeizure({ ...row, _count: { custodyLogs: 0, applications: 0 } });
  }

  async updateSeizure(id: string, dto: UpdateCustomsSeizureDto) {
    const existing = await this.prisma.customsSeizure.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Seizure not found');

    if (dto.linkedMatterId) {
      const linked = await this.prisma.matter.findUnique({
        where: { id: dto.linkedMatterId },
        select: { id: true },
      });
      if (!linked) throw new BadRequestException('Linked matter not found');
    }

    const row = await this.prisma.customsSeizure.update({
      where: { id },
      data: {
        ...(dto.seizureDate != null
          ? { seizureDate: new Date(dto.seizureDate) }
          : {}),
        ...(dto.customsOffice != null
          ? { customsOffice: dto.customsOffice.trim() }
          : {}),
        ...(dto.goodsDescription != null
          ? { goodsDescription: dto.goodsDescription.trim() }
          : {}),
        ...(dto.consignmentReference !== undefined
          ? { consignmentReference: dto.consignmentReference?.trim() || null }
          : {}),
        ...(dto.quantity !== undefined
          ? { quantity: dto.quantity?.trim() || null }
          : {}),
        ...(dto.portOfEntry !== undefined
          ? { portOfEntry: dto.portOfEntry?.trim() || null }
          : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
        ...(dto.linkedMatterId !== undefined
          ? { linkedMatterId: dto.linkedMatterId }
          : {}),
      },
      include: {
        createdBy: { select: userSelect },
        linkedMatter: { select: { id: true, title: true, matterType: true } },
        _count: { select: { custodyLogs: true, applications: true } },
      },
    });
    return this.serializeSeizure(row);
  }

  async addCustody(seizureId: string, dto: CreateCustodyLogDto, userId: string) {
    const seizure = await this.prisma.customsSeizure.findUnique({
      where: { id: seizureId },
    });
    if (!seizure) throw new NotFoundException('Seizure not found');

    if (dto.documentVersionId) {
      const version = await this.prisma.matterDocumentVersion.findUnique({
        where: { id: dto.documentVersionId },
        include: { document: { select: { matterId: true } } },
      });
      if (!version || version.document.matterId !== seizure.matterId) {
        throw new BadRequestException(
          'Document version must belong to the seizure matter',
        );
      }
    }

    const log = await this.prisma.custodyLog.create({
      data: {
        seizureId,
        actorUserId: userId,
        action: dto.action,
        occurredAt: new Date(dto.occurredAt),
        notes: dto.notes?.trim() || null,
        documentVersionId: dto.documentVersionId ?? null,
      },
      include: {
        actorUser: { select: userSelect },
        documentVersion: {
          select: { id: true, fileName: true, documentId: true },
        },
      },
    });

    return {
      id: log.id,
      action: log.action,
      occurredAt: log.occurredAt,
      notes: log.notes,
      actorUser: log.actorUser,
      documentVersion: log.documentVersion,
      createdAt: log.createdAt,
    };
  }

  async listApplications(matterId: string) {
    await this.assertBorderMeasuresMatter(matterId);
    const rows = await this.prisma.customsApplication.findMany({
      where: { matterId },
      orderBy: [{ createdAt: 'desc' }],
      include: { createdBy: { select: userSelect } },
    });
    return rows.map((row) => this.serializeApplication(row));
  }

  async createApplication(
    matterId: string,
    dto: CreateCustomsApplicationDto,
    userId: string,
  ) {
    await this.assertBorderMeasuresMatter(matterId);
    if (dto.seizureId) {
      const seizure = await this.prisma.customsSeizure.findFirst({
        where: { id: dto.seizureId, matterId },
      });
      if (!seizure) {
        throw new BadRequestException('Seizure not found on this matter');
      }
    }

    const row = await this.prisma.customsApplication.create({
      data: {
        matterId,
        seizureId: dto.seizureId ?? null,
        authority: dto.authority.trim(),
        applicationNumber: dto.applicationNumber?.trim() || null,
        submittedDate: dto.submittedDate ? new Date(dto.submittedDate) : null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        renewalOfId: dto.renewalOfId ?? null,
        createdById: userId,
      },
      include: { createdBy: { select: userSelect } },
    });
    return this.serializeApplication(row);
  }

  async updateApplication(id: string, dto: UpdateCustomsApplicationDto) {
    const existing = await this.prisma.customsApplication.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Application not found');

    const row = await this.prisma.customsApplication.update({
      where: { id },
      data: {
        ...(dto.authority != null ? { authority: dto.authority.trim() } : {}),
        ...(dto.seizureId !== undefined ? { seizureId: dto.seizureId } : {}),
        ...(dto.applicationNumber !== undefined
          ? { applicationNumber: dto.applicationNumber?.trim() || null }
          : {}),
        ...(dto.submittedDate !== undefined
          ? {
              submittedDate: dto.submittedDate
                ? new Date(dto.submittedDate)
                : null,
            }
          : {}),
        ...(dto.validFrom !== undefined
          ? { validFrom: dto.validFrom ? new Date(dto.validFrom) : null }
          : {}),
        ...(dto.validUntil !== undefined
          ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null }
          : {}),
        ...(dto.status != null ? { status: dto.status } : {}),
      },
      include: { createdBy: { select: userSelect } },
    });
    return this.serializeApplication(row);
  }

  private async assertBorderMeasuresMatter(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true, matterType: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
    if (matter.matterType !== MatterType.border_measures) {
      throw new BadRequestException(
        'Customs records are only available on border_measures matters',
      );
    }
    return matter;
  }

  private serializeSeizure(row: {
    id: string;
    matterId: string;
    clientId: string;
    seizureDate: Date;
    customsOffice: string;
    consignmentReference: string | null;
    goodsDescription: string;
    quantity: string | null;
    portOfEntry: string | null;
    status: string;
    linkedMatterId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { id: string; fullName: string; email: string };
    linkedMatter?: { id: string; title: string; matterType: string } | null;
    _count?: { custodyLogs: number; applications: number };
  }) {
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      seizureDate: row.seizureDate,
      customsOffice: row.customsOffice,
      consignmentReference: row.consignmentReference,
      goodsDescription: row.goodsDescription,
      quantity: row.quantity,
      portOfEntry: row.portOfEntry,
      status: row.status,
      linkedMatterId: row.linkedMatterId,
      linkedMatter: row.linkedMatter ?? null,
      createdById: row.createdById,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      custodyCount: row._count?.custodyLogs ?? undefined,
      applicationCount: row._count?.applications ?? undefined,
    };
  }

  private serializeApplication(row: {
    id: string;
    matterId: string;
    seizureId: string | null;
    authority: string;
    applicationNumber: string | null;
    submittedDate: Date | null;
    validFrom: Date | null;
    validUntil: Date | null;
    status: string;
    renewalOfId: string | null;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: { id: string; fullName: string; email: string };
  }) {
    return {
      id: row.id,
      matterId: row.matterId,
      seizureId: row.seizureId,
      authority: row.authority,
      applicationNumber: row.applicationNumber,
      submittedDate: row.submittedDate,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      status: row.status,
      renewalOfId: row.renewalOfId,
      createdById: row.createdById,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
