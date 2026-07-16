import { NotFoundException } from '@nestjs/common';
import {
  DeadlineRuleTriggerType,
  DeadlineStatus,
  MatterType,
} from '../../generated/prisma/client';
import type { DeadlineNotifyService } from '../notifications/deadline-notify.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomsSeizureDeadlinesService } from './customs-seizure-deadlines.service';
import type { HolidaysService } from './holidays.service';

describe('CustomsSeizureDeadlinesService', () => {
  let service: CustomsSeizureDeadlinesService;
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
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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

    service = new CustomsSeizureDeadlinesService(
      prisma as unknown as PrismaService,
      deadlineNotify as unknown as DeadlineNotifyService,
      holidays as unknown as HolidaysService,
    );
  });

  it('throws when matter is missing', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(
      service.generateFromSeizure('m1', 's1', new Date('2026-01-01'), 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('skips non border_measures matters', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.trademark,
      jurisdictions: [],
      assignedToId: 'u1',
    });

    await expect(
      service.generateFromSeizure('m1', 's1', new Date('2026-01-01'), 'u1'),
    ).resolves.toEqual({
      matterId: 'm1',
      seizureId: 's1',
      created: 0,
      skipped: 'wrong_matter_type',
    });
  });

  it('creates deadlines from customs seizure rules', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.border_measures,
      assignedToId: 'u1',
      filedById: null,
      jurisdictions: [{ countryCode: 'DE' }],
    });
    prisma.deadlineRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        jurisdiction: 'EU',
        daysOffset: 10,
        isBusinessDays: false,
        gracePeriodDays: 0,
        description: 'Respond to seizure',
      },
    ]);
    prisma.deadline.findFirst.mockResolvedValue(null);
    prisma.deadline.create.mockResolvedValue({ id: 'd1' });

    const result = await service.generateFromSeizure(
      'm1',
      's1',
      new Date('2026-01-05'),
      'u1',
    );

    expect(prisma.deadlineRule.findMany).toHaveBeenCalledWith({
      where: {
        matterType: MatterType.border_measures,
        triggerType: DeadlineRuleTriggerType.customs_seizure,
        isActive: true,
      },
    });
    expect(result).toEqual({
      matterId: 'm1',
      seizureId: 's1',
      created: 1,
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

  it('skips when no applicable rules exist', async () => {
    prisma.matter.findUnique.mockResolvedValue({
      id: 'm1',
      matterType: MatterType.border_measures,
      assignedToId: 'u1',
      jurisdictions: [{ countryCode: 'US' }],
    });
    prisma.deadlineRule.findMany.mockResolvedValue([
      { id: 'rule-1', jurisdiction: 'JP', daysOffset: 5 },
    ]);

    await expect(
      service.generateFromSeizure('m1', 's1', new Date('2026-01-01'), 'u1'),
    ).resolves.toEqual({
      matterId: 'm1',
      seizureId: 's1',
      created: 0,
      skipped: 'no_rules',
    });
  });
});
