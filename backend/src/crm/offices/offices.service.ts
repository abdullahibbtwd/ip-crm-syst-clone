import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { HistoryService } from '../history/history.service';
import { CreateOfficeDto, UpdateOfficeDto } from './dto/office.dto';

@Injectable()
export class OfficesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly history: HistoryService,
  ) {}

  async create(clientId: string, dto: CreateOfficeDto, userId?: string) {
    await this.clientsService.ensureWritableClient(clientId);

    const office = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.clientOffice.updateMany({
          where: { clientId, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.clientOffice.create({
        data: { clientId, ...dto },
      });
    });

    await this.history.log({
      clientId,
      userId,
      eventType: RelationshipEventType.office_added,
      description: `Office added: ${office.label}`,
      metadata: { officeId: office.id },
    });

    return office;
  }

  async findAll(clientId: string) {
    await this.clientsService.findOne(clientId);
    return this.prisma.clientOffice.findMany({
      where: { clientId },
      orderBy: [{ isPrimary: 'desc' }, { label: 'asc' }],
    });
  }

  async update(
    clientId: string,
    officeId: string,
    dto: UpdateOfficeDto,
    userId?: string,
  ) {
    await this.clientsService.ensureWritableClient(clientId);
    const office = await this.getOfficeOrThrow(clientId, officeId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.clientOffice.updateMany({
          where: { clientId, isPrimary: true, NOT: { id: officeId } },
          data: { isPrimary: false },
        });
      }

      return tx.clientOffice.update({
        where: { id: officeId },
        data: dto,
      });
    });

    if (dto.isPrimary && !office.isPrimary) {
      await this.history.log({
        clientId,
        userId,
        eventType: RelationshipEventType.office_added,
        description: `Primary office set: ${updated.label}`,
        metadata: { officeId },
      });
    }

    return updated;
  }

  async remove(clientId: string, officeId: string) {
    await this.clientsService.ensureWritableClient(clientId);
    const office = await this.getOfficeOrThrow(clientId, officeId);

    if (office.isPrimary) {
      const others = await this.prisma.clientOffice.count({
        where: { clientId, NOT: { id: officeId } },
      });
      if (others === 0) {
        throw new BadRequestException('Cannot delete the only office');
      }
    }

    await this.prisma.clientOffice.delete({ where: { id: officeId } });
    return { deleted: true };
  }

  private async getOfficeOrThrow(clientId: string, officeId: string) {
    const office = await this.prisma.clientOffice.findFirst({
      where: { id: officeId, clientId },
    });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }
}
