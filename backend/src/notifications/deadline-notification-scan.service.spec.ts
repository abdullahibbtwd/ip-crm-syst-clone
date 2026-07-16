import { DeadlineStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlineNotificationScanService } from './deadline-notification-scan.service';
import type { NotificationDispatchService } from './notification-dispatch.service';

function deadlineRow(overrides: Record<string, unknown> = {}) {
  const due = new Date();
  due.setHours(12, 0, 0, 0);
  return {
    id: 'd1',
    title: 'OA response',
    status: DeadlineStatus.pending,
    dueDate: due,
    graceDate: null,
    remindersSent: [],
    assignedToId: 'u1',
    matterId: 'm1',
    escalationLevel: 0,
    assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    matter: { id: 'm1', title: 'Matter A' },
    ...overrides,
  };
}

describe('DeadlineNotificationScanService', () => {
  let service: DeadlineNotificationScanService;
  let prisma: {
    deadline: { findMany: jest.Mock; update: jest.Mock };
  };
  let dispatch: {
    dispatchDeadline: jest.Mock;
    ensureManagingPartnerDeadlineCopies: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      deadline: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    dispatch = {
      dispatchDeadline: jest.fn().mockResolvedValue(undefined),
      ensureManagingPartnerDeadlineCopies: jest
        .fn()
        .mockResolvedValue(0),
    };
    service = new DeadlineNotificationScanService(
      prisma as unknown as PrismaService,
      dispatch as unknown as NotificationDispatchService,
    );
  });

  it('sends due_today reminder and persists remindersSent', async () => {
    const dueToday = deadlineRow();
    prisma.deadline.findMany
      .mockResolvedValueOnce([dueToday]) // candidates
      .mockResolvedValueOnce([]) // overdue catchup
      .mockResolvedValueOnce([]) // escalation
      .mockResolvedValueOnce([]); // backfill

    const result = await service.run();

    expect(dispatch.dispatchDeadline).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ milestone: 'due_today' }),
      }),
    );
    expect(prisma.deadline.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          remindersSent: expect.arrayContaining(['due_today']),
        }),
      }),
    );
    expect(result.remindersSent).toBe(1);
  });

  it('skips milestones already recorded in remindersSent', async () => {
    prisma.deadline.findMany
      .mockResolvedValueOnce([
        deadlineRow({ remindersSent: ['due_today'] }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.run();

    expect(dispatch.dispatchDeadline).not.toHaveBeenCalled();
    expect(result.remindersSent).toBe(0);
  });

  it('sends overdue catchup when after_3 was missed', async () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    past.setHours(12, 0, 0, 0);

    prisma.deadline.findMany
      .mockResolvedValueOnce([]) // candidates outside window or empty
      .mockResolvedValueOnce([
        deadlineRow({ dueDate: past, remindersSent: [] }),
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await service.run();

    expect(dispatch.dispatchDeadline).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ milestone: 'overdue' }),
      }),
    );
    expect(result.remindersSent).toBe(1);
  });
});
