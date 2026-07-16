import { NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterType,
} from '../../generated/prisma/client';
import type { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { OfficeActionDeadlinesService } from './office-action-deadlines.service';
import type { HolidaysService } from './holidays.service';

describe('OfficeActionDeadlinesService', () => {
  let service: OfficeActionDeadlinesService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    deadlineRule: { findMany: jest.Mock };
    deadline: {
      findFirst: jest.Mock;
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let holidays: { getHolidaySetAround: jest.Mock };
  let deadlineNotify: { notifyAssigned: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      deadlineRule: { findMany: jest.fn() },
      deadline: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
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

    service = new OfficeActionDeadlinesService(
      prisma as unknown as PrismaService,
      deadlineNotify as unknown as DeadlineNotifyService,
      holidays as unknown as HolidaysService,
    );
  });

  it('throws when matter is missing', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(
      service.generateFromOfficeAction(
        'm1',
        'corr-1',
        new Date('2026-01-01'),
        'u1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips when there is no assignee', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.trademark,
      assignedToId: null,
      filedById: null,
      jurisdictions: [{ countryCode: 'DE' }],
    });

    await expect(
      service.generateFromOfficeAction(
        'm1',
        'corr-1',
        new Date('2026-01-01'),
        'u1',
      ),
    ).resolves.toEqual({
      matterId: 'm1',
      correspondenceId: 'corr-1',
      created: 0,
      skipped: 'no_assignee',
    });
  });

  it('creates office action deadlines and supersedes pending ones', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.trademark,
      assignedToId: 'u1',
      filedById: null,
      jurisdictions: [{ countryCode: 'DE' }],
    });
    prisma.deadlineRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        daysOffset: 30,
        isBusinessDays: false,
        gracePeriodDays: 0,
        description: 'Office action reply',
      },
    ]);
    prisma.deadline.findFirst.mockResolvedValue(null);
    prisma.deadline.create.mockResolvedValue({ id: 'd1' });

    const result = await service.generateFromOfficeAction(
      'm1',
      'corr-1',
      new Date('2026-02-01'),
      'u1',
    );

    expect(prisma.deadlineRule.findMany).toHaveBeenCalledWith({
      where: {
        jurisdiction: 'EU',
        matterType: MatterType.trademark,
        triggerType: DeadlineRuleTriggerType.office_action,
        isActive: true,
      },
    });
    expect(result).toEqual({
      matterId: 'm1',
      correspondenceId: 'corr-1',
      created: 1,
      superseded: 2,
      deadlineIds: ['d1'],
    });
    expect(prisma.deadline.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: DeadlineStatus.superseded },
      }),
    );
    expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
    expect(deadlineNotify.notifyAssigned).toHaveBeenCalledWith('d1');
  });

  it('does not duplicate deadlines for the same correspondence', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.patent,
      assignedToId: 'u1',
      jurisdictions: [{ countryCode: 'BG' }],
    });
    prisma.deadlineRule.findMany.mockResolvedValue([
      { id: 'rule-1', daysOffset: 14, isBusinessDays: false, gracePeriodDays: 0 },
    ]);
    prisma.deadline.findFirst.mockResolvedValue({ id: 'existing' });

    const result = await service.generateFromOfficeAction(
      'm1',
      'corr-1',
      new Date('2026-02-01'),
      'u1',
    );

    expect(result.created).toBe(0);
    expect(prisma.deadline.create).not.toHaveBeenCalled();
  });
});
