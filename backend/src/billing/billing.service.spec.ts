import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import type { RateResolutionService } from './rate-resolution.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    client: { findUnique: jest.Mock };
    rateCard: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    timeEntry: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    fixedFee: {
      findMany: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $queryRaw: jest.Mock;
  };
  let rateResolution: { resolveForMatter: jest.Mock };

  const loggedBy = { id: 'u1', fullName: 'Ada', email: 'a@x.com' };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      client: { findUnique: jest.fn() },
      rateCard: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      timeEntry: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      fixedFee: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    rateResolution = { resolveForMatter: jest.fn() };
    service = new BillingService(
      prisma as unknown as PrismaService,
      rateResolution as unknown as RateResolutionService,
    );
  });

  describe('rate cards', () => {
    it('listRateCards serializes decimals', async () => {
      prisma.rateCard.findMany.mockResolvedValue([
        {
          id: 'rc1',
          role: 'ip_attorney',
          matterType: null,
          clientId: null,
          hourlyRate: new Prisma.Decimal('200'),
          internalCostPerHour: new Prisma.Decimal('80'),
          currency: 'EUR',
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.listRateCards();
      expect(result[0].hourlyRate).toBe(200);
      expect(result[0].internalCostPerHour).toBe(80);
    });

    it('createRateCard persists dto', async () => {
      prisma.rateCard.create.mockResolvedValue({
        id: 'rc1',
        role: 'ip_attorney',
        matterType: null,
        clientId: null,
        hourlyRate: new Prisma.Decimal('200'),
        internalCostPerHour: null,
        currency: 'EUR',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createRateCard({
        role: 'ip_attorney',
        hourlyRate: 200,
        effectiveFrom: '2026-01-01',
      });

      expect(prisma.rateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'ip_attorney',
            hourlyRate: 200,
            currency: 'EUR',
          }),
        }),
      );
    });

    it('updateRateCard throws when missing', async () => {
      prisma.rateCard.findUnique.mockResolvedValue(null);
      await expect(
        service.updateRateCard('missing', { hourlyRate: 220 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updateRateCard updates existing card', async () => {
      prisma.rateCard.findUnique.mockResolvedValue({ id: 'rc1' });
      prisma.rateCard.update.mockResolvedValue({
        id: 'rc1',
        role: 'ip_attorney',
        matterType: null,
        clientId: null,
        hourlyRate: new Prisma.Decimal('220'),
        internalCostPerHour: new Prisma.Decimal('90'),
        currency: 'EUR',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.updateRateCard('rc1', {
        hourlyRate: 220,
        internalCostPerHour: 90,
      });

      expect(result.hourlyRate).toBe(220);
    });

    it('resolveRate delegates to rate resolution', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({ hourlyRate: 200 });
      const result = await service.resolveRate('m1', ['ip_attorney'], 'ip_attorney');
      expect(rateResolution.resolveForMatter).toHaveBeenCalledWith({
        matterId: 'm1',
        userRoles: ['ip_attorney'],
        roleOverride: 'ip_attorney',
      });
      expect(result.hourlyRate).toBe(200);
    });
  });

  describe('createTimeEntry', () => {
    beforeEach(() => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    });

    it('rejects non quarter-hour hours', async () => {
      await expect(
        service.createTimeEntry(
          'm1',
          {
            date: '2026-01-10',
            hours: 0.3,
            description: 'Work',
          },
          'u1',
          ['ip_attorney'],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('forces non-billable when resolved rate is unrated', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({
        hourlyRate: 0,
        internalCostPerHour: 0,
        isUnrated: true,
      });
      prisma.timeEntry.create.mockResolvedValue({
        id: 'te1',
        matterId: 'm1',
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('0'),
        costSnapshot: new Prisma.Decimal('0'),
        amount: new Prisma.Decimal('0'),
        isBillable: false,
        loggedBy,
      });

      const result = await service.createTimeEntry(
        'm1',
        {
          date: '2026-01-10',
          hours: 1,
          description: 'Research',
        },
        'u1',
        ['ip_attorney'],
      );

      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isBillable: false,
            rateSnapshot: 0,
            amount: 0,
          }),
        }),
      );
      expect(result.isUnrated).toBe(true);
    });

    it('persists amount from resolved hourly rate', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({
        hourlyRate: 200,
        internalCostPerHour: 80,
        isUnrated: false,
      });
      prisma.timeEntry.create.mockResolvedValue({
        id: 'te1',
        matterId: 'm1',
        hours: new Prisma.Decimal('1.5'),
        rateSnapshot: new Prisma.Decimal('200'),
        costSnapshot: new Prisma.Decimal('80'),
        amount: new Prisma.Decimal('300'),
        isBillable: true,
        loggedBy,
      });

      await service.createTimeEntry(
        'm1',
        {
          date: '2026-01-10',
          hours: 1.5,
          description: 'Drafting',
        },
        'u1',
        ['ip_attorney'],
      );

      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hours: 1.5,
            rateSnapshot: 200,
            costSnapshot: 80,
            amount: 300,
            isBillable: true,
          }),
        }),
      );
    });

    it('rejects billable entry with zero rate snapshot', async () => {
      await expect(
        service.createTimeEntry(
          'm1',
          {
            date: '2026-01-10',
            hours: 1,
            description: 'Work',
            rateSnapshot: 0,
            isBillable: true,
          },
          'u1',
          ['ip_attorney'],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.createTimeEntry(
          'missing',
          { date: '2026-01-10', hours: 1, description: 'x' },
          'u1',
          ['ip_attorney'],
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listTimeEntries', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listTimeEntries('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns serialized entries', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'te1',
          matterId: 'm1',
          hours: new Prisma.Decimal('2'),
          rateSnapshot: new Prisma.Decimal('200'),
          costSnapshot: new Prisma.Decimal('80'),
          amount: new Prisma.Decimal('400'),
          isBillable: true,
          loggedBy,
        },
      ]);

      const result = await service.listTimeEntries('m1');
      expect(result[0].hours).toBe(2);
      expect(result[0].amount).toBe(400);
    });
  });

  describe('updateTimeEntry', () => {
    it('throws when entry is missing', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTimeEntry('missing', { hours: 1 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('blocks update of invoiced entries', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: 'inv-1',
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('200'),
        isBillable: true,
      });
      await expect(
        service.updateTimeEntry('te1', { hours: 2 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updates uninvoiced entry', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: null,
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('200'),
        isBillable: true,
      });
      prisma.timeEntry.update.mockResolvedValue({
        id: 'te1',
        matterId: 'm1',
        hours: new Prisma.Decimal('2'),
        rateSnapshot: new Prisma.Decimal('200'),
        costSnapshot: new Prisma.Decimal('80'),
        amount: new Prisma.Decimal('400'),
        isBillable: true,
        loggedBy,
      });

      const result = await service.updateTimeEntry('te1', { hours: 2 });
      expect(result.hours).toBe(2);
      expect(result.amount).toBe(400);
    });
  });

  describe('deleteTimeEntry', () => {
    it('blocks deletion of invoiced entries', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: 'inv-1',
      });
      await expect(service.deleteTimeEntry('te1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('deletes uninvoiced entries', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: null,
      });
      prisma.timeEntry.delete.mockResolvedValue({});
      await expect(service.deleteTimeEntry('te1')).resolves.toEqual({
        deleted: true,
      });
    });
  });

  describe('fixed fees', () => {
    beforeEach(() => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    });

    it('listFixedFees throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listFixedFees('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('createFixedFee trims description', async () => {
      prisma.fixedFee.create.mockResolvedValue({
        id: 'ff1',
        matterId: 'm1',
        description: 'Filing fee',
        amount: new Prisma.Decimal('500'),
        currency: 'EUR',
        category: 'official',
        date: new Date('2026-01-10'),
        isBillable: true,
        invoiceId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createFixedFee('m1', {
        description: ' Filing fee ',
        amount: 500,
        category: 'official',
        date: '2026-01-10',
      });

      expect(result.amount).toBe(500);
      expect(prisma.fixedFee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Filing fee' }),
        }),
      );
    });

    it('updateFixedFee blocks invoiced fees', async () => {
      prisma.fixedFee.findUnique.mockResolvedValue({
        id: 'ff1',
        invoiceId: 'inv-1',
      });
      await expect(
        service.updateFixedFee('ff1', { amount: 600 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('deleteFixedFee removes uninvoiced fee', async () => {
      prisma.fixedFee.findUnique.mockResolvedValue({
        id: 'ff1',
        invoiceId: null,
      });
      prisma.fixedFee.delete.mockResolvedValue({});
      await expect(service.deleteFixedFee('ff1')).resolves.toEqual({
        deleted: true,
      });
    });
  });

  describe('billing summaries', () => {
    it('getBillingSummary returns zeros when no row', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getBillingSummary('m1');
      expect(result).toEqual({
        matterId: 'm1',
        totalHours: 0,
        totalBillableHours: 0,
        totalBillableAmount: 0,
        totalInternalCost: 0,
        totalFixedFees: 0,
        totalAmount: 0,
        unbilledAmount: 0,
      });
    });

    it('getBillingSummary serializes row with margin', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.$queryRaw.mockResolvedValue([
        {
          matter_id: 'm1',
          total_hours: '10',
          total_billable_hours: '8',
          total_billable_amount: '1600',
          total_internal_cost: '400',
          total_fixed_fees: '200',
          total_amount: '1800',
          unbilled_amount: '500',
        },
      ]);

      const result = await service.getBillingSummary('m1');
      expect(result.totalAmount).toBe(1800);
      expect(result.totalMargin).toBe(1400);
    });

    it('getClientBillingSummary aggregates matter totals', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.$queryRaw.mockResolvedValue([
        {
          matter_id: 'm1',
          title: 'Matter A',
          matter_type: 'trademark',
          status: 'open',
          total_hours: '5',
          total_billable_hours: '5',
          total_billable_amount: '1000',
          total_internal_cost: '200',
          total_fixed_fees: '100',
          total_amount: '1100',
          unbilled_amount: '300',
        },
        {
          matter_id: 'm2',
          title: 'Matter B',
          matter_type: 'patent',
          status: 'open',
          total_hours: '3',
          total_billable_hours: '3',
          total_billable_amount: '600',
          total_internal_cost: '120',
          total_fixed_fees: '0',
          total_amount: '600',
          unbilled_amount: '600',
        },
      ]);

      const result = await service.getClientBillingSummary('c1');
      expect(result.clientId).toBe('c1');
      expect(result.matters).toHaveLength(2);
      expect(result.totals.totalAmount).toBe(1700);
      expect(result.totals.unbilledAmount).toBe(900);
    });

    it('getClientBillingSummary throws when client missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.getClientBillingSummary('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listAllTimeEntries', () => {
    it('applies optional filters and caps limit', async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);
      await service.listAllTimeEntries({
        matterId: 'm1',
        loggedById: 'u1',
        from: '2026-01-01',
        to: '2026-01-31',
        limit: 500,
      });
      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matterId: 'm1',
            loggedById: 'u1',
            date: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          take: 200,
        }),
      );
    });

    it('returns serialized entries with matter', async () => {
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'te1',
          matterId: 'm1',
          hours: new Prisma.Decimal('1'),
          rateSnapshot: new Prisma.Decimal('100'),
          costSnapshot: new Prisma.Decimal('40'),
          amount: new Prisma.Decimal('100'),
          isBillable: true,
          loggedBy,
          matter: { id: 'm1', title: 'Matter', client: null },
        },
      ]);
      const rows = await service.listAllTimeEntries({});
      expect(rows[0].hours).toBe(1);
      expect(rows[0].matter.id).toBe('m1');
    });
  });

  describe('listAllFixedFees', () => {
    it('applies category and date filters', async () => {
      prisma.fixedFee.findMany.mockResolvedValue([]);
      await service.listAllFixedFees({
        category: 'official',
        matterId: 'm1',
        from: '2026-01-01',
        to: '2026-01-31',
      });
      expect(prisma.fixedFee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'official',
            matterId: 'm1',
          }),
        }),
      );
    });
  });

  describe('createTimeEntry edge cases', () => {
    beforeEach(() => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    });

    it('uses explicit rateSnapshot and resolves cost', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({
        hourlyRate: 200,
        internalCostPerHour: 75,
        isUnrated: false,
      });
      prisma.timeEntry.create.mockResolvedValue({
        id: 'te1',
        matterId: 'm1',
        hours: new Prisma.Decimal('2'),
        rateSnapshot: new Prisma.Decimal('150'),
        costSnapshot: new Prisma.Decimal('75'),
        amount: new Prisma.Decimal('300'),
        isBillable: true,
        loggedBy,
      });

      await service.createTimeEntry(
        'm1',
        {
          date: '2026-01-10',
          hours: 2,
          description: 'Review',
          rateSnapshot: 150,
          isBillable: true,
        },
        'u1',
        ['ip_attorney'],
      );

      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rateSnapshot: 150,
            costSnapshot: 75,
            amount: 300,
          }),
        }),
      );
    });

    it('rejects billable entry with zero explicit rate snapshot', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({
        hourlyRate: 0,
        internalCostPerHour: 0,
        isUnrated: false,
      });

      await expect(
        service.createTimeEntry(
          'm1',
          {
            date: '2026-01-10',
            hours: 1,
            description: 'Pro bono',
            rateSnapshot: 0,
            isBillable: true,
          },
          'u1',
          ['ip_attorney'],
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows non-billable entry with zero explicit rate', async () => {
      rateResolution.resolveForMatter.mockResolvedValue({
        hourlyRate: 0,
        internalCostPerHour: 0,
        isUnrated: false,
      });
      prisma.timeEntry.create.mockResolvedValue({
        id: 'te1',
        matterId: 'm1',
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('0'),
        costSnapshot: new Prisma.Decimal('0'),
        amount: new Prisma.Decimal('0'),
        isBillable: false,
        loggedBy,
      });

      await service.createTimeEntry(
        'm1',
        {
          date: '2026-01-10',
          hours: 1,
          description: 'Pro bono',
          rateSnapshot: 0,
          isBillable: false,
        },
        'u1',
        ['ip_attorney'],
      );

      expect(prisma.timeEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isBillable: false, amount: 0 }),
        }),
      );
    });
  });

  describe('updateTimeEntry validation', () => {
    it('rejects invalid hours increment', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: null,
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('200'),
        isBillable: true,
      });
      await expect(
        service.updateTimeEntry('te1', { hours: 0.3 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects billable update with zero rate', async () => {
      prisma.timeEntry.findUnique.mockResolvedValue({
        id: 'te1',
        invoiceId: null,
        hours: new Prisma.Decimal('1'),
        rateSnapshot: new Prisma.Decimal('200'),
        isBillable: true,
      });
      await expect(
        service.updateTimeEntry('te1', { isBillable: true, rateSnapshot: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('fixed fee mutations', () => {
    it('updateFixedFee throws when missing', async () => {
      prisma.fixedFee.findUnique.mockResolvedValue(null);
      await expect(
        service.updateFixedFee('missing', { amount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deleteFixedFee throws when missing', async () => {
      prisma.fixedFee.findUnique.mockResolvedValue(null);
      await expect(service.deleteFixedFee('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deleteFixedFee blocks invoiced fees', async () => {
      prisma.fixedFee.findUnique.mockResolvedValue({
        id: 'ff1',
        invoiceId: 'inv-1',
      });
      await expect(service.deleteFixedFee('ff1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('rate card serialization', () => {
    it('serializes null internalCostPerHour', async () => {
      prisma.rateCard.findMany.mockResolvedValue([
        {
          id: 'rc1',
          role: 'paralegal',
          matterType: 'trademark',
          clientId: 'c1',
          hourlyRate: new Prisma.Decimal('120'),
          internalCostPerHour: null,
          currency: 'EUR',
          effectiveFrom: new Date('2026-01-01'),
          effectiveTo: new Date('2026-12-31'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      const rows = await service.listRateCards();
      expect(rows[0].internalCostPerHour).toBeNull();
    });

    it('createRateCard with optional fields', async () => {
      prisma.rateCard.create.mockResolvedValue({
        id: 'rc1',
        role: 'ip_attorney',
        matterType: 'patent',
        clientId: 'c1',
        hourlyRate: new Prisma.Decimal('250'),
        internalCostPerHour: new Prisma.Decimal('90'),
        currency: 'USD',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2026-06-30'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.createRateCard({
        role: 'ip_attorney',
        matterType: 'patent',
        clientId: 'c1',
        hourlyRate: 250,
        internalCostPerHour: 90,
        currency: 'USD',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-06-30',
      });

      expect(prisma.rateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterType: 'patent',
            clientId: 'c1',
            currency: 'USD',
            effectiveTo: expect.any(Date),
          }),
        }),
      );
    });

    it('createRateCard defaults currency to EUR', async () => {
      prisma.rateCard.create.mockResolvedValue({
        id: 'rc-eur',
        role: 'paralegal',
        matterType: null,
        clientId: null,
        hourlyRate: new Prisma.Decimal('100'),
        internalCostPerHour: null,
        currency: 'EUR',
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await service.createRateCard({
        role: 'paralegal',
        hourlyRate: 100,
        effectiveFrom: '2026-01-01',
      });
      expect(prisma.rateCard.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: 'EUR' }),
        }),
      );
    });

    it('listAllTimeEntries applies from-only date filter', async () => {
      prisma.timeEntry.findMany.mockResolvedValue([]);
      await service.listAllTimeEntries({ from: '2026-02-01' });
      expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { gte: expect.any(Date) },
          }),
        }),
      );
    });

    it('listAllFixedFees applies to-only date filter', async () => {
      prisma.fixedFee.findMany.mockResolvedValue([]);
      await service.listAllFixedFees({ to: '2026-02-28' });
      expect(prisma.fixedFee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            date: { lte: expect.any(Date) },
          }),
        }),
      );
    });

    it('serializeTimeEntry marks unrated billable entries', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.timeEntry.findMany.mockResolvedValue([
        {
          id: 'te-unrated',
          matterId: 'm1',
          hours: new Prisma.Decimal('1'),
          rateSnapshot: new Prisma.Decimal('0'),
          costSnapshot: new Prisma.Decimal('0'),
          amount: new Prisma.Decimal('0'),
          isBillable: true,
          loggedBy,
        },
      ]);
      const rows = await service.listTimeEntries('m1');
      expect(rows[0].isUnrated).toBe(true);
    });

    it('updateRateCard omits internalCostPerHour when undefined', async () => {
      prisma.rateCard.findUnique.mockResolvedValue({ id: 'rc1' });
      prisma.rateCard.update.mockResolvedValue({
        id: 'rc1',
        role: 'paralegal',
        matterType: null,
        clientId: null,
        hourlyRate: new Prisma.Decimal('120'),
        internalCostPerHour: new Prisma.Decimal('40'),
        currency: 'EUR',
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await service.updateRateCard('rc1', { hourlyRate: 130 });
      expect(prisma.rateCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            internalCostPerHour: expect.anything(),
          }),
        }),
      );
    });

    it('getBillingSummary handles null summary row fields', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.$queryRaw.mockResolvedValue([
        {
          matter_id: 'm1',
          total_hours: null,
          total_billable_hours: null,
          total_billable_amount: null,
          total_internal_cost: null,
          total_fixed_fees: null,
          total_amount: null,
          unbilled_amount: null,
        },
      ]);
      const summary = await service.getBillingSummary('m1');
      expect(summary.totalHours).toBe(0);
      expect(summary.totalAmount).toBe(0);
    });
  });
});
