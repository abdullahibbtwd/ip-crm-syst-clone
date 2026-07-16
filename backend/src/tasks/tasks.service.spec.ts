import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskStatus } from '../../generated/prisma/client';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    user: { findFirst: jest.Mock; findUnique: jest.Mock };
    task: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { dispatch: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), findUnique: jest.fn() },
      task: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matterTimelineEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    service = new TasksService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationDispatchService,
    );
  });

  describe('create', () => {
    it('creates a task, timeline event, and notifies assignee', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.user.findFirst.mockResolvedValue({ id: 'assignee' });
      prisma.task.create.mockResolvedValue({
        id: 't1',
        title: 'Draft OA',
        assignedToId: 'assignee',
        createdById: 'creator',
        assignedTo: {
          id: 'assignee',
          fullName: 'Bob',
          email: 'bob@x.com',
        },
        createdBy: { id: 'creator', fullName: 'Ada', email: 'a@x.com' },
      });

      await service.create(
        'm1',
        { title: 'Draft OA', assignedToId: 'assignee' },
        'creator',
      );

      expect(prisma.task.create).toHaveBeenCalled();
      expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'assignee',
          type: 'task_assigned',
        }),
      );
    });
  });

  describe('update', () => {
    it('throws when task is missing', async () => {
      prisma.task.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', {}, 'u1', []),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids non-MP edits on completed tasks', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.completed,
        assignedToId: 'u1',
        createdById: 'u1',
      });

      await expect(
        service.update('t1', { title: 'x' }, 'u1', ['paralegal']),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('completes when assignee sets status completed', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        matterId: 'm1',
        title: 'Draft OA',
        status: TaskStatus.pending,
        assignedToId: 'u1',
        createdById: 'u2',
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        fullName: 'Ada',
        email: 'a@x.com',
      });
      prisma.task.update.mockResolvedValue({
        id: 't1',
        status: TaskStatus.completed,
      });

      await service.update(
        't1',
        { status: TaskStatus.completed },
        'u1',
        ['ip_attorney'],
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.completed,
            completedById: 'u1',
          }),
        }),
      );
    });

    it('allows MP reassignment on completed tasks', async () => {
      prisma.task.findUnique.mockResolvedValue({
        id: 't1',
        status: TaskStatus.completed,
        assignedToId: 'old',
        createdById: 'u2',
      });
      prisma.user.findFirst.mockResolvedValue({ id: 'new' });
      prisma.task.update.mockResolvedValue({ id: 't1' });

      await service.update(
        't1',
        { assignedToId: 'new' },
        'mp1',
        [SYSTEM_ROLES.MANAGING_PARTNER],
      );

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { assignedToId: 'new' },
        }),
      );
    });
  });
});
