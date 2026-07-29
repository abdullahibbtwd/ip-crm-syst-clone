import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Jurisdiction } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJurisdictionDto,
  ListJurisdictionsQueryDto,
  UpdateJurisdictionDto,
} from './dto/jurisdiction.dto';

export type JurisdictionAutomationLevel = 'full' | 'partial' | 'manual';

export function resolveAutomationLevel(
  ruleCount: number,
  holidayCount: number,
): JurisdictionAutomationLevel {
  if (ruleCount <= 0) return 'manual';
  if (holidayCount <= 0) return 'partial';
  return 'full';
}

@Injectable()
export class JurisdictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListJurisdictionsQueryDto = {}) {
    const where: Prisma.JurisdictionWhereInput = {};
    if (query.activeOnly) where.isActive = true;
    if (query.priorityOnly) where.isPriority = true;
    if (query.type) where.type = query.type;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { officeName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.jurisdiction.findMany({
      where,
      orderBy: [
        { isPriority: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    if (rows.length === 0) return [];

    const codes = rows.map((r) => r.code);
    const [ruleGroups, holidayGroups] = await Promise.all([
      this.prisma.deadlineRule.groupBy({
        by: ['jurisdiction'],
        where: { jurisdiction: { in: codes }, isActive: true },
        _count: { _all: true },
      }),
      this.prisma.holiday.groupBy({
        by: ['jurisdiction'],
        where: { jurisdiction: { in: codes } },
        _count: { _all: true },
      }),
    ]);

    const ruleCountByCode = new Map(
      ruleGroups.map((g) => [g.jurisdiction, g._count._all]),
    );
    const holidayCountByCode = new Map(
      holidayGroups.map((g) => [g.jurisdiction, g._count._all]),
    );

    return rows.map((row) => {
      const ruleCount = ruleCountByCode.get(row.code) ?? 0;
      const holidayCount = holidayCountByCode.get(row.code) ?? 0;
      return {
        ...row,
        ruleCount,
        holidayCount,
        automationLevel: resolveAutomationLevel(ruleCount, holidayCount),
      };
    });
  }

  async findById(id: string) {
    const row = await this.prisma.jurisdiction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Jurisdiction not found');
    return this.enrichOne(row);
  }

  async findByCode(code: string) {
    const row = await this.prisma.jurisdiction.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!row) throw new NotFoundException('Jurisdiction not found');
    return this.enrichOne(row);
  }

  private async enrichOne(row: Jurisdiction) {
    const [ruleCount, holidayCount] = await Promise.all([
      this.prisma.deadlineRule.count({
        where: { jurisdiction: row.code, isActive: true },
      }),
      this.prisma.holiday.count({ where: { jurisdiction: row.code } }),
    ]);
    return {
      ...row,
      ruleCount,
      holidayCount,
      automationLevel: resolveAutomationLevel(ruleCount, holidayCount),
    };
  }

  async create(dto: CreateJurisdictionDto) {
    const code = dto.code.trim().toUpperCase();
    try {
      const row = await this.prisma.jurisdiction.create({
        data: {
          code,
          name: dto.name.trim(),
          officeName: dto.officeName.trim(),
          type: dto.type ?? 'national',
          isPriority: dto.isPriority ?? false,
          isActive: dto.isActive ?? true,
          sortOrder: dto.sortOrder ?? 100,
        },
      });
      return {
        ...row,
        ruleCount: 0,
        holidayCount: 0,
        automationLevel: 'manual' as const,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          `Jurisdiction code ${code} already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateJurisdictionDto) {
    await this.findById(id);
    const row = await this.prisma.jurisdiction.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        officeName:
          dto.officeName === undefined ? undefined : dto.officeName.trim(),
        type: dto.type,
        isPriority: dto.isPriority,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });
    return this.enrichOne(row);
  }

  async deactivate(id: string) {
    await this.findById(id);
    const row = await this.prisma.jurisdiction.update({
      where: { id },
      data: { isActive: false },
    });
    return this.enrichOne(row);
  }
}
