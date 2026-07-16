import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RateResolutionService } from './rate-resolution.service';

describe('RateResolutionService', () => {
  let service: RateResolutionService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    rateCard: { findFirst: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      rateCard: { findFirst: jest.fn() },
    };
    service = new RateResolutionService(prisma as unknown as PrismaService);
  });

  describe('pickBillingRole', () => {
    it('picks the highest-priority matching role', () => {
      expect(
        service.pickBillingRole(['paralegal', 'managing_partner']),
      ).toBe('managing_partner');
      expect(service.pickBillingRole(['coordinator'])).toBe('coordinator');
      expect(service.pickBillingRole(['finance'])).toBeNull();
    });
  });

  describe('resolveForMatter', () => {
    it('returns unrated when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      const result = await service.resolveForMatter({
        matterId: 'm1',
        userRoles: ['ip_attorney'],
      });
      expect(result.isUnrated).toBe(true);
      expect(result.resolutionLevel).toBe('unrated');
    });

    it('returns unrated when no billing role matches', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        matterType: 'trademark',
      });
      const result = await service.resolveForMatter({
        matterId: 'm1',
        userRoles: ['finance'],
      });
      expect(result.isUnrated).toBe(true);
      expect(prisma.rateCard.findFirst).not.toHaveBeenCalled();
    });

    it('resolves client-specific rate first', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        matterType: 'trademark',
      });
      prisma.rateCard.findFirst.mockResolvedValueOnce({
        id: 'rc1',
        hourlyRate: new Prisma.Decimal('250'),
        internalCostPerHour: new Prisma.Decimal('100'),
        currency: 'EUR',
        role: 'ip_attorney',
      });

      const result = await service.resolveForMatter({
        matterId: 'm1',
        userRoles: ['ip_attorney'],
      });

      expect(result).toMatchObject({
        hourlyRate: 250,
        internalCostPerHour: 100,
        rateCardId: 'rc1',
        isUnrated: false,
        resolutionLevel: 'client_matter_type',
      });
    });

    it('falls back to firm matter-type then firm any', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        matterType: 'patent',
      });
      prisma.rateCard.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'rc-firm',
          hourlyRate: new Prisma.Decimal('180'),
          internalCostPerHour: null,
          currency: 'EUR',
          role: 'ip_attorney',
        });

      const result = await service.resolveForMatter({
        matterId: 'm1',
        userRoles: ['ip_attorney'],
      });

      expect(result.resolutionLevel).toBe('firm_matter_type');
      expect(result.hourlyRate).toBe(180);
      expect(result.hasInternalCost).toBe(false);
    });
  });
});
