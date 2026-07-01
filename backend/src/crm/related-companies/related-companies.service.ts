import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { HistoryService } from '../history/history.service';
import { CreateRelatedCompanyDto } from './dto/related-company.dto';

@Injectable()
export class RelatedCompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly history: HistoryService,
  ) {}

  async create(clientId: string, dto: CreateRelatedCompanyDto, userId?: string) {
    await this.clientsService.ensureWritableClient(clientId);

    const hasRelated = Boolean(dto.relatedClientId);
    const hasExternal = Boolean(dto.externalName?.trim());

    if (hasRelated === hasExternal) {
      throw new BadRequestException(
        'Provide either relatedClientId or externalName, not both',
      );
    }

    if (dto.relatedClientId === clientId) {
      throw new BadRequestException('A client cannot be related to itself');
    }

    if (dto.relatedClientId) {
      await this.clientsService.findOne(dto.relatedClientId);
    }

    const relation = await this.prisma.relatedCompany.create({
      data: {
        clientId,
        relatedClientId: dto.relatedClientId,
        externalName: dto.externalName?.trim(),
        relationshipType: dto.relationshipType,
        notes: dto.notes,
      },
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
    });

    await this.history.log({
      clientId,
      userId,
      eventType: RelationshipEventType.related_company_linked,
      description: `Related company linked (${dto.relationshipType})`,
      metadata: {
        relatedCompanyId: relation.id,
        relatedClientId: dto.relatedClientId,
        externalName: dto.externalName,
      },
    });

    return relation;
  }

  async findAll(clientId: string) {
    await this.clientsService.findOne(clientId);
    return this.prisma.relatedCompany.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
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
    });
  }

  async remove(clientId: string, relId: string) {
    await this.clientsService.ensureWritableClient(clientId);
    const relation = await this.prisma.relatedCompany.findFirst({
      where: { id: relId, clientId },
    });
    if (!relation) throw new NotFoundException('Related company not found');

    await this.prisma.relatedCompany.delete({ where: { id: relId } });
    return { deleted: true };
  }
}
