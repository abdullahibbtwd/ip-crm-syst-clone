import { NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterType,
} from '../../generated/prisma/client';
import type { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import type { HolidaysService } from '../deadlines/holidays.service';
import { RenewalDeadlinesService } from './renewal-deadlines.service';

function renewalWindowRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rw1',
    matterId: 'm1',
    ipRightId: 'ipr1',
    cycleNumber: 1,
    jurisdiction: 'EU',
    dueDate: new Date('2030-06-15'),
    graceDate: new Date('2030-12-15'),
    matter: {
      id: 'm1',
      matterType: MatterType.trademark,
      assignedToId: 'u1',
      filedById: null,
    },
    ipRight: { id: 'ipr1', title: 'Mark' },
    ...overrides,
  };
}

describe('RenewalDeadlinesService', () => {
  let service: RenewalDeadlinesService;
  let prisma: {
    renewalWindow: { findUnique: jest.Mock };
    deadlineRule: { findMany: jest.Mock };
    deadline: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let holidays: { getHolidaySetAround: jest.Mock };
  let deadlineNotify: { notifyAssigned: jest.Mock };

  beforeEach(() => {
    prisma = {
      renewalWindow: { findUnique: jest.fn() },
      deadlineRule: { findMany: jest.fn().mockResolvedValue([]) },
      deadline: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'd1' }),
        update: jest.fn(),
      },
      matterTimelineEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    holidays = {
      getHolidaySetAround: jest.fn().mockResolvedValue(new Set<string>()),
    };
    deadlineNotify = {
      notifyAssigned: jest.fn().mockResolvedValue(undefined),
    };

    service = new RenewalDeadlinesService(
      prisma as unknown as PrismaService,
      deadlineNotify as unknown as DeadlineNotifyService,
      holidays as unknown as HolidaysService,
    );
  });

  describe('generateFromWindow', () => {
    it('throws when renewal window is missing', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(null);
      await expect(
        service.generateFromWindow('missing', 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('skips when matter has no assignee', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        renewalWindowRow({
          matter: {
            id: 'm1',
            matterType: MatterType.trademark,
            assignedToId: null,
            filedById: null,
          },
        }),
      );

      const result = await service.generateFromWindow('rw1', 'u1');

      expect(result).toEqual(
        expect.objectContaining({
          renewalWindowId: 'rw1',
          created: 0,
          updated: 0,
          skipped: 'no_assignee',
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('creates deadlines from active renewal_due rules', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(renewalWindowRow());
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule1',
          daysOffset: -90,
          gracePeriodDays: 0,
          isBusinessDays: false,
          description: 'Renewal reminder',
        },
      ]);

      const result = await service.generateFromWindow('rw1', 'u1');

      expect(holidays.getHolidaySetAround).toHaveBeenCalled();
      expect(prisma.deadlineRule.findMany).toHaveBeenCalledWith({
        where: {
          jurisdiction: 'EU',
          matterType: MatterType.trademark,
          triggerType: DeadlineRuleTriggerType.renewal_due,
          isActive: true,
        },
      });
      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matterId: 'm1',
          ruleId: 'rule1',
          sourceRenewalWindowId: 'rw1',
          assignedToId: 'u1',
          status: DeadlineStatus.pending,
        }),
      });
      expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
      expect(deadlineNotify.notifyAssigned).toHaveBeenCalledWith('d1');
      expect(result.created).toBe(1);
      expect(result.deadlineIds).toEqual(['d1']);
    });

    it('updates existing pending deadlines instead of creating duplicates', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(renewalWindowRow());
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule1',
          daysOffset: -30,
          gracePeriodDays: 0,
          isBusinessDays: false,
          description: null,
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue({
        id: 'existing',
        status: DeadlineStatus.pending,
      });

      const result = await service.generateFromWindow('rw1', 'u1');

      expect(prisma.deadline.update).toHaveBeenCalledWith({
        where: { id: 'existing' },
        data: expect.objectContaining({
          assignedToId: 'u1',
        }),
      });
      expect(prisma.deadline.create).not.toHaveBeenCalled();
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('uses filedById when assignedToId is absent', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        renewalWindowRow({
          matter: {
            id: 'm1',
            matterType: MatterType.trademark,
            assignedToId: null,
            filedById: 'u2',
          },
        }),
      );
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule1',
          daysOffset: -30,
          gracePeriodDays: 0,
          isBusinessDays: false,
          description: null,
        },
      ]);

      await service.generateFromWindow('rw1', 'u1');

      expect(prisma.deadline.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ assignedToId: 'u2' }),
      });
    });
  });
});
