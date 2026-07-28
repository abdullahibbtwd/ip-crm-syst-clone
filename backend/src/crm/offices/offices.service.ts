import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { HistoryService } from '../history/history.service';
import {
  CLIENT_OFFICE_ADDRESS_TYPE,
  isTypedClientOfficeAddressType,
  TYPED_ADDRESS_LABELS,
  type ClientOfficeAddressTypeValue,
  type TypedClientOfficeAddressType,
} from './client-office-address.util';
import { CreateOfficeDto, UpdateOfficeDto } from './dto/office.dto';
import { UpsertTypedAddressDto } from './dto/upsert-typed-address.dto';

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
        data: {
          clientId,
          addressType: CLIENT_OFFICE_ADDRESS_TYPE.branch,
          ...dto,
        },
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

  async upsertTypedAddress(
    clientId: string,
    addressType: ClientOfficeAddressTypeValue,
    dto: UpsertTypedAddressDto,
    userId?: string,
  ) {
    if (!isTypedClientOfficeAddressType(addressType)) {
      throw new BadRequestException(
        'Address type must be registered_legal or correspondence',
      );
    }

    await this.clientsService.ensureWritableClient(clientId);

    const typedAddressType = addressType as TypedClientOfficeAddressType;
    const label = TYPED_ADDRESS_LABELS[typedAddressType];
    const isPrimary =
      typedAddressType === CLIENT_OFFICE_ADDRESS_TYPE.registered_legal;

    const existing = await this.prisma.clientOffice.findFirst({
      where: { clientId, addressType },
    });

    const office = await this.prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.clientOffice.updateMany({
          where: { clientId, isPrimary: true, NOT: { addressType } },
          data: { isPrimary: false },
        });
      }

      if (existing) {
        return tx.clientOffice.update({
          where: { id: existing.id },
          data: { ...dto, label, isPrimary },
        });
      }

      return tx.clientOffice.create({
        data: {
          clientId,
          addressType,
          label,
          isPrimary,
          ...dto,
        },
      });
    });

    await this.history.log({
      clientId,
      userId,
      eventType: RelationshipEventType.office_added,
      description: `${label} ${existing ? 'updated' : 'added'}`,
      metadata: { officeId: office.id, addressType },
    });

    return office;
  }

  async findAll(clientId: string) {
    await this.clientsService.findOne(clientId);
    return this.prisma.clientOffice.findMany({
      where: { clientId },
      orderBy: [{ addressType: 'asc' }, { isPrimary: 'desc' }, { label: 'asc' }],
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

    if (isTypedClientOfficeAddressType(office.addressType)) {
      throw new BadRequestException(
        'Use the typed address endpoint for registered or correspondence addresses',
      );
    }

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

    if (isTypedClientOfficeAddressType(office.addressType)) {
      await this.prisma.clientOffice.delete({ where: { id: officeId } });
      return { deleted: true };
    }

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
