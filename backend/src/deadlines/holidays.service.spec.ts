import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysService } from './holidays.service';

function uniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('HolidaysService', () => {
  let service: HolidaysService;
  let prisma: {
    holiday: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      holiday: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new HolidaysService(prisma as unknown as PrismaService);
  });

  describe('getHolidaySet', () => {
    it('expands recurring holidays across years', async () => {
      prisma.holiday.findMany.mockResolvedValue([
        {
          date: new Date(Date.UTC(2020, 0, 1)),
          isRecurring: true,
        },
      ]);

      const keys = await service.getHolidaySet('bg', 2025, 2026);
      expect(keys.has('2025-01-01')).toBe(true);
      expect(keys.has('2026-01-01')).toBe(true);
      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: { jurisdiction: 'BG' },
        select: { date: true, isRecurring: true },
      });
    });

    it('keeps non-recurring holidays as stored date keys', async () => {
      prisma.holiday.findMany.mockResolvedValue([
        {
          date: new Date(2026, 6, 4),
          isRecurring: false,
        },
      ]);

      const keys = await service.getHolidaySet('EU', 2026, 2026);
      expect(keys.size).toBe(1);
      expect(keys.has('2026-07-04')).toBe(true);
    });
  });

  describe('create', () => {
    it('uppercases jurisdiction and creates the holiday', async () => {
      prisma.holiday.create.mockResolvedValue({ id: 'h1' });
      await service.create(
        {
          jurisdiction: 'bg',
          date: '2026-05-01',
          name: ' Labour Day ',
          isRecurring: true,
        },
        'user-1',
      );

      expect(prisma.holiday.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdiction: 'BG',
          name: 'Labour Day',
          isRecurring: true,
          createdById: 'user-1',
        }),
      });
    });

    it('maps P2002 to ConflictException', async () => {
      prisma.holiday.create.mockRejectedValue(uniqueConflict());
      await expect(
        service.create({
          jurisdiction: 'BG',
          date: '2026-01-01',
          name: 'New Year',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('findById', () => {
    it('throws when missing', async () => {
      prisma.holiday.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
