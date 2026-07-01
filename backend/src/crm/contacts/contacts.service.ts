import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactRole,
  RelationshipEventType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { HistoryService } from '../history/history.service';
import {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly history: HistoryService,
  ) {}

  async create(clientId: string, dto: CreateContactDto, userId?: string) {
    await this.clientsService.ensureWritableClient(clientId);
    await this.validateOffice(clientId, dto.officeId);

    const contact = await this.prisma.$transaction(async (tx) => {
      if (dto.role === ContactRole.primary) {
        await tx.contact.updateMany({
          where: { clientId, role: ContactRole.primary, isActive: true },
          data: { role: ContactRole.general },
        });
      }

      return tx.contact.create({
        data: { clientId, ...dto },
      });
    });

    await this.history.log({
      clientId,
      userId,
      eventType: RelationshipEventType.contact_added,
      description: `Contact added: ${contact.firstName} ${contact.lastName} (${contact.role})`,
      metadata: { contactId: contact.id, role: contact.role },
    });

    return contact;
  }

  async findAll(clientId: string, query: ContactQueryDto) {
    await this.clientsService.findOne(clientId);
    return this.prisma.contact.findMany({
      where: {
        clientId,
        isActive: true,
        role: query.role,
      },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      include: {
        office: { select: { id: true, label: true } },
      },
    });
  }

  async update(
    clientId: string,
    contactId: string,
    dto: UpdateContactDto,
    userId?: string,
  ) {
    await this.clientsService.ensureWritableClient(clientId);
    const existing = await this.getContactOrThrow(clientId, contactId);

    if (dto.officeId) {
      await this.validateOffice(clientId, dto.officeId);
    }

    const contact = await this.prisma.$transaction(async (tx) => {
      const nextRole = dto.role ?? existing.role;
      if (nextRole === ContactRole.primary && existing.role !== ContactRole.primary) {
        await tx.contact.updateMany({
          where: {
            clientId,
            role: ContactRole.primary,
            isActive: true,
            NOT: { id: contactId },
          },
          data: { role: ContactRole.general },
        });
      }

      return tx.contact.update({
        where: { id: contactId },
        data: dto,
      });
    });

    if (dto.role === ContactRole.primary && existing.role !== ContactRole.primary) {
      await this.history.log({
        clientId,
        userId,
        eventType: RelationshipEventType.contact_added,
        description: `Primary contact set: ${contact.firstName} ${contact.lastName}`,
        metadata: { contactId },
      });
    }

    return contact;
  }

  async deactivate(clientId: string, contactId: string) {
    await this.clientsService.ensureWritableClient(clientId);
    await this.getContactOrThrow(clientId, contactId);

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { isActive: false },
    });
  }

  private async getContactOrThrow(clientId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  private async validateOffice(clientId: string, officeId?: string) {
    if (!officeId) return;
    const office = await this.prisma.clientOffice.findFirst({
      where: { id: officeId, clientId },
    });
    if (!office) {
      throw new BadRequestException('officeId does not belong to this client');
    }
  }
}
