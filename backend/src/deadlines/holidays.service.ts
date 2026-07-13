import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateHolidayDto,
  ListHolidaysQueryDto,
  UpdateHolidayDto,
} from './dto/holiday.dto';
import { toDateKey, type HolidaySet } from './deadlines.utils';

@Injectable()
export class HolidaysService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListHolidaysQueryDto = {}) {
    const where: Prisma.HolidayWhereInput = {};
    if (query.jurisdiction) {
      where.jurisdiction = query.jurisdiction.trim().toUpperCase();
    }
    if (query.from || query.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.holiday.findMany({
      where,
      orderBy: [{ jurisdiction: 'asc' }, { date: 'asc' }],
    });
  }

  async findById(id: string) {
    const holiday = await this.prisma.holiday.findUnique({ where: { id } });
    if (!holiday) throw new NotFoundException('Holiday not found');
    return holiday;
  }

  /**
   * Returns YYYY-MM-DD keys for a jurisdiction, expanding recurring holidays
   * across the given year range (inclusive).
   */
  async getHolidaySet(
    jurisdiction: string,
    fromYear: number,
    toYear: number,
  ): Promise<HolidaySet> {
    const code = jurisdiction.trim().toUpperCase();
    const rows = await this.prisma.holiday.findMany({
      where: { jurisdiction: code },
      select: { date: true, isRecurring: true },
    });

    const keys = new Set<string>();
    for (const row of rows) {
      const month = row.date.getUTCMonth();
      const day = row.date.getUTCDate();
      if (row.isRecurring) {
        for (let y = fromYear; y <= toYear; y += 1) {
          keys.add(toDateKey(new Date(Date.UTC(y, month, day))));
        }
      } else {
        keys.add(toDateKey(new Date(row.date)));
      }
    }
    return keys;
  }

  /** Convenience for deadline generators around a base date ± a few years. */
  async getHolidaySetAround(
    jurisdiction: string,
    around: Date,
  ): Promise<HolidaySet> {
    const y = around.getFullYear();
    return this.getHolidaySet(jurisdiction, y - 1, y + 5);
  }

  async create(dto: CreateHolidayDto, userId?: string) {
    const jurisdiction = dto.jurisdiction.trim().toUpperCase();
    const date = new Date(dto.date);
    try {
      return await this.prisma.holiday.create({
        data: {
          jurisdiction,
          date,
          name: dto.name.trim(),
          isRecurring: dto.isRecurring ?? false,
          createdById: userId ?? null,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A holiday already exists for this jurisdiction and date',
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateHolidayDto) {
    await this.findById(id);
    return this.prisma.holiday.update({
      where: { id },
      data: {
        name: dto.name === undefined ? undefined : dto.name.trim(),
        isRecurring: dto.isRecurring,
        date: dto.date === undefined ? undefined : new Date(dto.date),
        jurisdiction:
          dto.jurisdiction === undefined
            ? undefined
            : dto.jurisdiction.trim().toUpperCase(),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.holiday.delete({ where: { id } });
    return { id, deleted: true };
  }
}
