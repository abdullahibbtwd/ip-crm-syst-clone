import { PrismaService } from '../prisma/prisma.service';
import { DeadlineNotifyService } from './deadline-notify.service';
import type { NotificationDispatchService } from './notification-dispatch.service';

describe('DeadlineNotifyService', () => {
  let service: DeadlineNotifyService;
  let prisma: { deadline: { findUnique: jest.Mock } };
  let dispatch: { dispatchDeadline: jest.Mock };

  beforeEach(() => {
    prisma = { deadline: { findUnique: jest.fn() } };
    dispatch = { dispatchDeadline: jest.fn().mockResolvedValue(undefined) };
    service = new DeadlineNotifyService(
      prisma as unknown as PrismaService,
      dispatch as unknown as NotificationDispatchService,
    );
  });

  it('no-ops when deadline is missing', async () => {
    prisma.deadline.findUnique.mockResolvedValue(null);
    await service.notifyAssigned('missing');
    expect(dispatch.dispatchDeadline).not.toHaveBeenCalled();
  });

  it('notifies for a future deadline', async () => {
    const due = new Date();
    due.setDate(due.getDate() + 5);
    prisma.deadline.findUnique.mockResolvedValue({
      id: 'd1',
      title: 'OA response',
      dueDate: due,
      assignedToId: 'u1',
      matterId: 'm1',
      assignedTo: { id: 'u1', email: 'a@x.com', fullName: 'Ada' },
      matter: { id: 'm1', title: 'Matter' },
    });

    await service.notifyAssigned('d1');

    expect(dispatch.dispatchDeadline).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        title: 'New deadline: OA response',
        metadata: expect.objectContaining({ source: 'deadline_created' }),
      }),
    );
  });

  it('uses overdue copy when due date is in the past', async () => {
    const due = new Date();
    due.setDate(due.getDate() - 2);
    prisma.deadline.findUnique.mockResolvedValue({
      id: 'd1',
      title: 'OA response',
      dueDate: due,
      assignedToId: 'u1',
      matterId: 'm1',
      assignedTo: { id: 'u1', email: 'a@x.com', fullName: 'Ada' },
      matter: { id: 'm1', title: 'Matter' },
    });

    await service.notifyAssigned('d1');

    expect(dispatch.dispatchDeadline).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Overdue deadline assigned: OA response',
        emailSubject: expect.stringContaining('Overdue:'),
      }),
    );
  });
});
