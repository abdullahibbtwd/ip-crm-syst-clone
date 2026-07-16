import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlineRulesService } from './deadline-rules.service';

function uniqueConflict() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('DeadlineRulesService', () => {
  let service: DeadlineRulesService;
  let prisma: {
    deadlineRule: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      deadlineRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new DeadlineRulesService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('applies defaults and uppercases jurisdiction', async () => {
      prisma.deadlineRule.create.mockResolvedValue({ id: 'r1' });

      await service.create({
        jurisdiction: 'eu',
        matterType: MatterType.trademark,
        eventType: 'filing' as never,
        triggerType: DeadlineRuleTriggerType.matter_created,
        daysOffset: 30,
        description: '  First action  ',
      });

      expect(prisma.deadlineRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdiction: 'EU',
          isBusinessDays: true,
          gracePeriodDays: 0,
          priority: 2,
          description: 'First action',
          isActive: true,
        }),
      });
    });

    it('maps P2002 to ConflictException', async () => {
      prisma.deadlineRule.create.mockRejectedValue(uniqueConflict());
      await expect(
        service.create({
          jurisdiction: 'EU',
          matterType: MatterType.trademark,
          eventType: 'filing' as never,
          triggerType: DeadlineRuleTriggerType.matter_created,
          daysOffset: 10,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('throws when rule is missing', async () => {
      prisma.deadlineRule.findUnique.mockResolvedValue(null);
      await expect(service.deactivate('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('soft-deactivates an existing rule', async () => {
      prisma.deadlineRule.findUnique.mockResolvedValue({ id: 'r1' });
      prisma.deadlineRule.update.mockResolvedValue({
        id: 'r1',
        isActive: false,
      });

      await service.deactivate('r1');

      expect(prisma.deadlineRule.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { isActive: false },
      });
    });
  });
});
