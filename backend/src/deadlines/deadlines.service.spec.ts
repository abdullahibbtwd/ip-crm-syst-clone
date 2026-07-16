import { NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterType,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import type { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlinesService } from './deadlines.service';
import type { HolidaysService } from './holidays.service';

describe('DeadlinesService', () => {
  let service: DeadlinesService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    deadlineRule: { findMany: jest.Mock };
    deadline: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let holidays: { getHolidaySetAround: jest.Mock };
  let deadlineNotify: { notifyAssigned: jest.Mock };
  let portalAccess: { requireScopeClientId: jest.Mock };

  const staff = { userId: 'u1' } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      deadlineRule: { findMany: jest.fn() },
      deadline: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      matterTimelineEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    holidays = {
      getHolidaySetAround: jest.fn().mockResolvedValue(new Set()),
    };
    deadlineNotify = {
      notifyAssigned: jest.fn().mockResolvedValue(undefined),
    };
    portalAccess = { requireScopeClientId: jest.fn().mockReturnValue(null) };

    service = new DeadlinesService(
      prisma as unknown as PrismaService,
      portalAccess as unknown as PortalAccessService,
      deadlineNotify as unknown as DeadlineNotifyService,
      holidays as unknown as HolidaysService,
    );
  });

  describe('generateInitialDeadlines', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.generateInitialDeadlines('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('skips when there is no assignee', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: null,
        filedById: null,
        matterType: MatterType.trademark,
        jurisdictions: [{ countryCode: 'DE' }],
        createdAt: new Date('2026-01-01'),
      });

      await expect(service.generateInitialDeadlines('m1')).resolves.toEqual({
        matterId: 'm1',
        created: 0,
        updated: 0,
        skipped: 'no_assignee',
      });
    });

    it('skips when jurisdictions do not map to rule authorities', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: 'u1',
        filedById: null,
        matterType: MatterType.trademark,
        jurisdictions: [{ countryCode: 'US' }],
        createdAt: new Date('2026-01-01'),
      });

      await expect(service.generateInitialDeadlines('m1')).resolves.toEqual({
        matterId: 'm1',
        created: 0,
        updated: 0,
        skipped: 'no_jurisdictions',
      });
    });

    it('creates deadlines from active matter_created rules', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: 'u1',
        filedById: null,
        matterType: MatterType.trademark,
        jurisdictions: [{ countryCode: 'DE' }],
        createdAt: new Date('2026-01-05'),
      });
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          daysOffset: 10,
          isBusinessDays: false,
          gracePeriodDays: 0,
          eventType: 'filing',
          description: 'First deadline',
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue(null);
      prisma.deadline.create.mockResolvedValue({ id: 'd1' });

      const result = await service.generateInitialDeadlines('m1');

      expect(result).toEqual({ matterId: 'm1', created: 1, updated: 0 });
      expect(prisma.deadlineRule.findMany).toHaveBeenCalledWith({
        where: {
          jurisdiction: 'EU',
          matterType: MatterType.trademark,
          triggerType: DeadlineRuleTriggerType.matter_created,
          isActive: true,
        },
      });
      expect(prisma.deadline.create).toHaveBeenCalled();
      expect(deadlineNotify.notifyAssigned).toHaveBeenCalledWith('d1');
    });

    it('updates existing active deadlines instead of creating', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: 'u1',
        filedById: null,
        matterType: MatterType.trademark,
        jurisdictions: [{ countryCode: 'BG' }],
        createdAt: new Date('2026-01-05'),
      });
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          daysOffset: 5,
          isBusinessDays: false,
          gracePeriodDays: 0,
          eventType: 'filing',
          description: null,
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue({
        id: 'd-existing',
        status: DeadlineStatus.pending,
      });
      prisma.deadline.update.mockResolvedValue({});

      const result = await service.generateInitialDeadlines('m1');

      expect(result).toEqual({ matterId: 'm1', created: 0, updated: 1 });
      expect(prisma.deadline.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'd-existing' } }),
      );
      expect(prisma.deadline.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('throws when deadline is missing', async () => {
      prisma.deadline.findUnique.mockResolvedValue(null);
      await expect(
        service.updateStatus('missing', DeadlineStatus.completed, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('sets completedAt when completing', async () => {
      prisma.deadline.findUnique.mockResolvedValue({
        id: 'd1',
        assignedToId: 'u1',
        escalationLevel: 0,
      });
      prisma.deadline.update.mockResolvedValue({ id: 'd1' });

      await service.updateStatus('d1', DeadlineStatus.completed, 'u1');

      expect(prisma.deadline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeadlineStatus.completed,
            completedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('increments escalationLevel when escalating', async () => {
      prisma.deadline.findUnique.mockResolvedValue({
        id: 'd1',
        assignedToId: 'u1',
        escalationLevel: 2,
      });
      prisma.deadline.update.mockResolvedValue({ id: 'd1' });

      await service.updateStatus('d1', DeadlineStatus.escalated, 'u1');

      expect(prisma.deadline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeadlineStatus.escalated,
            escalationLevel: 3,
            completedAt: null,
          }),
        }),
      );
    });
  });

  describe('generateDeadlinesFromFiling', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.generateDeadlinesFromFiling('missing', {
          jurisdiction: 'DE',
          filingDate: new Date('2026-01-01'),
          userId: 'u1',
          ipRightId: 'ip1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('records timeline events when generating from filing', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: 'u1',
        filedById: null,
        matterType: MatterType.trademark,
      });
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          daysOffset: 3,
          isBusinessDays: false,
          gracePeriodDays: 0,
          eventType: 'filing',
          description: 'Reply',
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue(null);
      prisma.deadline.create.mockResolvedValue({ id: 'd1' });

      const result = await service.generateDeadlinesFromFiling('m1', {
        jurisdiction: 'DE',
        filingDate: new Date('2026-01-05'),
        userId: 'u1',
        ipRightId: 'ip1',
      });

      expect(result).toEqual(
        expect.objectContaining({ matterId: 'm1', jurisdiction: 'DE', created: 1 }),
      );
      expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
    });
  });

  describe('countDueToday / listMyDeadlines / createManual', () => {
    it('countDueTodayForUser scopes to assignee for staff', async () => {
      portalAccess.requireScopeClientId.mockReturnValue(null);
      prisma.deadline.count.mockResolvedValue(4);

      await expect(service.countDueTodayForUser(staff)).resolves.toEqual({
        count: 4,
      });
      expect(prisma.deadline.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ assignedToId: 'u1' }),
        }),
      );
    });

    it('countDueTodayForUser scopes to client for portal users', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.deadline.count.mockResolvedValue(2);

      await expect(service.countDueTodayForUser(staff)).resolves.toEqual({
        count: 2,
      });
      expect(prisma.deadline.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ matter: { clientId: 'c1' } }),
        }),
      );
    });

    it('listMyDeadlines paginates active deadlines', async () => {
      portalAccess.requireScopeClientId.mockReturnValue(null);
      prisma.deadline.findMany.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);

      const result = await service.listMyDeadlines(staff, { limit: 1 } as never);

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe('d1');
    });

    it('createManual creates deadline and timeline event', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.deadline.create.mockResolvedValue({ id: 'd-new', title: 'Manual' });

      const result = await service.createManual(
        {
          matterId: 'm1',
          title: 'Manual deadline',
          jurisdiction: 'de',
          dueDate: '2026-02-01',
          assignedToId: 'u1',
        } as never,
        'u1',
      );

      expect(result.id).toBe('d-new');
      expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
      expect(deadlineNotify.notifyAssigned).toHaveBeenCalledWith('d-new');
    });

    it('findById throws when missing', async () => {
      prisma.deadline.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
