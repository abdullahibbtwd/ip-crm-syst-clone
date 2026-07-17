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
    it('clears completedAt when reopening from completed', async () => {
      prisma.deadline.findUnique.mockResolvedValue({
        id: 'd1',
        assignedToId: 'u1',
        escalationLevel: 0,
      });
      prisma.deadline.update.mockResolvedValue({ id: 'd1' });

      await service.updateStatus('d1', DeadlineStatus.pending, 'u1');

      expect(prisma.deadline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeadlineStatus.pending,
            completedAt: null,
          }),
        }),
      );
    });

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

  describe('listForMatter / getActiveByMatterId', () => {
    it('listForMatter throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listForMatter('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('listForMatter returns visible deadlines', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.deadline.findMany.mockResolvedValue([{ id: 'd1' }]);
      await expect(service.listForMatter('m1')).resolves.toEqual([{ id: 'd1' }]);
    });

    it('getActiveByMatterId filters active statuses', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.deadline.findMany.mockResolvedValue([{ id: 'd1' }]);
      await service.getActiveByMatterId('m1');
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matterId: 'm1',
            status: { in: expect.any(Array) },
          }),
        }),
      );
    });
  });

  describe('listAllDeadlines', () => {
    it('applies jurisdiction and overdue filters', async () => {
      prisma.deadline.findMany.mockResolvedValue([{ id: 'd1' }]);
      await service.listAllDeadlines({
        jurisdiction: 'EU',
        overdue: true,
        limit: 10,
      } as never);
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            dueDate: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('listMyDeadlines tabs', () => {
    it('filters completed tab', async () => {
      portalAccess.requireScopeClientId.mockReturnValue(null);
      prisma.deadline.findMany.mockResolvedValue([]);
      await service.listMyDeadlines(staff, { tab: 'completed' } as never);
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: DeadlineStatus.completed,
          }),
        }),
      );
    });

    it('filters overdue tab', async () => {
      portalAccess.requireScopeClientId.mockReturnValue(null);
      prisma.deadline.findMany.mockResolvedValue([]);
      await service.listMyDeadlines(staff, { tab: 'overdue' } as never);
      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: { lt: expect.any(Date) },
          }),
        }),
      );
    });
  });

  describe('countDueToday / countUpcomingByMatterIds', () => {
    it('countDueToday returns today count', async () => {
      prisma.deadline.count.mockResolvedValue(7);
      await expect(service.countDueToday('u1')).resolves.toEqual({ count: 7 });
    });

    it('countUpcomingByMatterIds returns empty map for no ids', async () => {
      await expect(service.countUpcomingByMatterIds([])).resolves.toEqual(
        new Map(),
      );
    });

    it('countUpcomingByMatterIds groups by matter', async () => {
      prisma.deadline.groupBy.mockResolvedValue([
        { matterId: 'm1', _count: { _all: 2 } },
      ]);
      const map = await service.countUpcomingByMatterIds(['m1']);
      expect(map.get('m1')).toBe(2);
    });
  });

  describe('generateDeadlinesFromFiling skip paths', () => {
    it('skips when assignee is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: null,
        filedById: null,
        matterType: MatterType.trademark,
      });
      await expect(
        service.generateDeadlinesFromFiling('m1', {
          jurisdiction: 'DE',
          filingDate: new Date('2026-01-01'),
          userId: 'u1',
          ipRightId: 'ip1',
        }),
      ).resolves.toEqual(
        expect.objectContaining({ skipped: 'no_assignee' }),
      );
    });

    it('skips unsupported jurisdictions', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: 'u1',
        filedById: null,
        matterType: MatterType.trademark,
      });
      await expect(
        service.generateDeadlinesFromFiling('m1', {
          jurisdiction: 'US',
          filingDate: new Date('2026-01-01'),
          userId: 'u1',
          ipRightId: 'ip1',
        }),
      ).resolves.toEqual(
        expect.objectContaining({ skipped: 'no_jurisdictions' }),
      );
    });
  });

  describe('createManual errors', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.createManual(
          {
            matterId: 'missing',
            title: 'Manual',
            jurisdiction: 'EU',
            dueDate: '2026-02-01',
            assignedToId: 'u1',
          } as never,
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('extended branch coverage', () => {
    it('generateInitialDeadlines uses filedById when assignee absent', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        assignedToId: null,
        filedById: 'filer-1',
        matterType: MatterType.trademark,
        jurisdictions: [{ countryCode: 'DE' }],
        createdAt: new Date('2026-01-05'),
      });
      prisma.deadlineRule.findMany.mockResolvedValue([
        {
          id: 'rule-1',
          daysOffset: 5,
          isBusinessDays: true,
          gracePeriodDays: 3,
          eventType: 'filing',
          description: 'Business deadline',
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue(null);
      prisma.deadline.create.mockResolvedValue({ id: 'd1' });

      const result = await service.generateInitialDeadlines('m1');
      expect(result.created).toBe(1);
      expect(holidays.getHolidaySetAround).toHaveBeenCalled();
      expect(prisma.deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedToId: 'filer-1',
            graceDate: expect.any(Date),
          }),
        }),
      );
    });

    it('generateInitialDeadlines skips updating inactive existing deadlines', async () => {
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
          daysOffset: 5,
          isBusinessDays: false,
          gracePeriodDays: 0,
          eventType: 'filing',
          description: null,
        },
      ]);
      prisma.deadline.findFirst.mockResolvedValue({
        id: 'd-old',
        status: DeadlineStatus.completed,
      });

      const result = await service.generateInitialDeadlines('m1');
      expect(result).toEqual({ matterId: 'm1', created: 0, updated: 0 });
      expect(prisma.deadline.update).not.toHaveBeenCalled();
    });

    it('listMyDeadlines supports pending, in_progress, all, and status filters', async () => {
      portalAccess.requireScopeClientId.mockReturnValue(null);
      prisma.deadline.findMany.mockResolvedValue([]);

      await service.listMyDeadlines(staff, { tab: 'pending' } as never);
      expect(prisma.deadline.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DeadlineStatus.pending }),
        }),
      );

      await service.listMyDeadlines(staff, { tab: 'in_progress' } as never);
      expect(prisma.deadline.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DeadlineStatus.in_progress }),
        }),
      );

      await service.listMyDeadlines(staff, { tab: 'all' } as never);
      expect(prisma.deadline.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: expect.any(Array) },
          }),
        }),
      );

      await service.listMyDeadlines(staff, {
        status: DeadlineStatus.escalated,
      } as never);
      expect(prisma.deadline.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: DeadlineStatus.escalated }),
        }),
      );
    });

    it('listAllDeadlines applies assignee, matterType, due range, and status', async () => {
      prisma.deadline.findMany.mockResolvedValue([{ id: 'd1' }]);
      await service.listAllDeadlines({
        assignedToId: 'u2',
        matterType: MatterType.patent,
        jurisdiction: 'EU',
        status: DeadlineStatus.pending,
        dueFrom: '2026-01-01',
        dueTo: '2026-12-31',
        limit: 5,
        cursor: 'd0',
      } as never);

      expect(prisma.deadline.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: 'u2',
            matter: expect.objectContaining({ matterType: MatterType.patent }),
            status: DeadlineStatus.pending,
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          cursor: { id: 'd0' },
          skip: 1,
        }),
      );
    });

    it('createManual stores optional grace date', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.deadline.create.mockResolvedValue({ id: 'd-new' });

      await service.createManual(
        {
          matterId: 'm1',
          title: 'Manual deadline',
          jurisdiction: 'eu',
          dueDate: '2026-02-01',
          graceDate: '2026-02-15',
          assignedToId: 'u1',
        } as never,
        'u1',
      );

      expect(prisma.deadline.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jurisdiction: 'EU',
            graceDate: expect.any(Date),
          }),
        }),
      );
    });

    it('countDueToday without assignee counts all staff deadlines', async () => {
      prisma.deadline.count.mockResolvedValue(9);
      await expect(service.countDueToday()).resolves.toEqual({ count: 9 });
      expect(prisma.deadline.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ assignedToId: expect.anything() }),
        }),
      );
    });

    it('findById returns deadline when present', async () => {
      prisma.deadline.findUnique.mockResolvedValue({ id: 'd1', title: 'Due' });
      await expect(service.findById('d1')).resolves.toMatchObject({ id: 'd1' });
    });

    it('updateStatus keeps completedAt when moving to in_progress', async () => {
      prisma.deadline.findUnique.mockResolvedValue({
        id: 'd1',
        assignedToId: 'u1',
        escalationLevel: 0,
      });
      prisma.deadline.update.mockResolvedValue({ id: 'd1' });

      await service.updateStatus('d1', DeadlineStatus.in_progress, 'u1');

      expect(prisma.deadline.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: DeadlineStatus.in_progress,
            completedAt: null,
            escalationLevel: 0,
          }),
        }),
      );
    });
  });
});
