import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseLimit } from '../dto/pagination.dto';
import {
  CreateHoldingGroupDto,
  HoldingGroupQueryDto,
  UpdateHoldingGroupDto,
} from './dto/holding-group.dto';

@Injectable()
export class HoldingGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateHoldingGroupDto) {
    return this.prisma.holdingGroup.create({ data: dto });
  }

  async findAll(query: HoldingGroupQueryDto) {
    const take = parseLimit(query.limit);
    const search = query.search?.trim();

    const rows = await this.prisma.holdingGroup.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { country: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
      take: take + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }

  async findOne(id: string) {
    const group = await this.prisma.holdingGroup.findUnique({
      where: { id },
      include: {
        clients: {
          select: {
            id: true,
            internalCode: true,
            type: true,
            status: true,
            companyName: true,
            firstName: true,
            lastName: true,
          },
          orderBy: { companyName: 'asc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Holding group not found');
    return group;
  }

  async update(id: string, dto: UpdateHoldingGroupDto) {
    await this.findOne(id);
    return this.prisma.holdingGroup.update({ where: { id }, data: dto });
  }
}
