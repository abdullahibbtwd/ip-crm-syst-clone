import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePartnerDto,
  ListPartnersQueryDto,
  UpdatePartnerDto,
} from './dto/partner.dto';

@Injectable()
export class PartnersService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListPartnersQueryDto = {}) {
    const search = query.search?.trim();
    const where: Prisma.PartnerWhereInput = {
      ...(query.activeOnly ? { isActive: true } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.partner.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  create(dto: CreatePartnerDto) {
    return this.prisma.partner.create({
      data: {
        name: dto.name.trim(),
        company: dto.company?.trim() || null,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        countryCode: dto.countryCode?.trim().toUpperCase() || null,
        jurisdictions: (dto.jurisdictions ?? []).map((j) =>
          j.trim().toUpperCase(),
        ),
        notes: dto.notes?.trim() || null,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdatePartnerDto) {
    await this.findById(id);
    return this.prisma.partner.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        company:
          dto.company === undefined ? undefined : dto.company?.trim() || null,
        email: dto.email === undefined ? undefined : dto.email?.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
        countryCode:
          dto.countryCode === undefined
            ? undefined
            : dto.countryCode?.trim().toUpperCase() || null,
        jurisdictions: dto.jurisdictions?.map((j) => j.trim().toUpperCase()),
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        isActive: dto.isActive,
      },
    });
  }

  /** Soft-deactivate — never hard-delete (instructions reference partners). */
  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.partner.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
