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

  describe('list', () => {
    it('filters by jurisdiction and date range', async () => {
      prisma.holiday.findMany.mockResolvedValue([]);
      await service.list({
        jurisdiction: 'bg',
        from: '2026-01-01',
        to: '2026-12-31',
      });
      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: {
          jurisdiction: 'BG',
          date: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-12-31'),
          },
        },
        orderBy: [{ jurisdiction: 'asc' }, { date: 'asc' }],
      });
    });
  });

  describe('getHolidaySetAround', () => {
    it('delegates to getHolidaySet with surrounding years', async () => {
      prisma.holiday.findMany.mockResolvedValue([]);
      await service.getHolidaySetAround('EU', new Date('2026-06-15'));
      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: { jurisdiction: 'EU' },
        select: { date: true, isRecurring: true },
      });
    });
  });

  describe('update / remove', () => {
    it('update trims fields after verifying holiday exists', async () => {
      prisma.holiday.findUnique.mockResolvedValue({ id: 'h1' });
      prisma.holiday.update.mockResolvedValue({ id: 'h1', name: 'Updated' });

      await service.update('h1', {
        name: ' Updated ',
        jurisdiction: 'de',
        date: '2026-12-25',
        isRecurring: true,
      });

      expect(prisma.holiday.update).toHaveBeenCalledWith({
        where: { id: 'h1' },
        data: {
          name: 'Updated',
          jurisdiction: 'DE',
          date: new Date('2026-12-25'),
          isRecurring: true,
        },
      });
    });

    it('remove deletes holiday after lookup', async () => {
      prisma.holiday.findUnique.mockResolvedValue({ id: 'h1' });
      prisma.holiday.delete.mockResolvedValue({});

      await expect(service.remove('h1')).resolves.toEqual({
        id: 'h1',
        deleted: true,
      });
      expect(prisma.holiday.delete).toHaveBeenCalledWith({ where: { id: 'h1' } });
    });
  });
});
