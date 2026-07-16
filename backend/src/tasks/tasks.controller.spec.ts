import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  MatterTasksController,
  TasksController,
} from './tasks.controller';
import type { TasksService } from './tasks.service';

describe('Tasks controllers', () => {
  const tasksService = {
    listForMatter: jest.fn(),
    create: jest.fn(),
    listMyTasks: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MatterTasksController', () => {
    const controller = new MatterTasksController(
      tasksService as unknown as TasksService,
    );

    it('list forwards matterId', async () => {
      await controller.list('m1');
      expect(tasksService.listForMatter).toHaveBeenCalledWith('m1');
    });

    it('create forwards matterId, dto, and userId', async () => {
      const dto = { title: 'Task', assignedToId: 'a1' };
      const req = {
        user: { userId: 'u1' } as AuthenticatedUser,
      } as Request;

      await controller.create('m1', dto, req);

      expect(tasksService.create).toHaveBeenCalledWith('m1', dto, 'u1');
    });
  });

  describe('TasksController', () => {
    const controller = new TasksController(
      tasksService as unknown as TasksService,
    );

    it('update forwards id, dto, userId, and roles', async () => {
      const dto = { title: 'Updated' };
      const req = {
        user: {
          userId: 'u1',
          roles: ['ip_attorney'],
        } as AuthenticatedUser,
      } as Request;

      await controller.update('t1', dto, req);

      expect(tasksService.update).toHaveBeenCalledWith(
        't1',
        dto,
        'u1',
        ['ip_attorney'],
      );
    });

    it('listMy forwards userId and query', async () => {
      const req = {
        user: { userId: 'u1' } as AuthenticatedUser,
      } as Request;
      await controller.listMy({ limit: 10 }, req);
      expect(tasksService.listMyTasks).toHaveBeenCalledWith('u1', {
        limit: 10,
      });
    });

    it('remove forwards id', async () => {
      await controller.remove('t1');
      expect(tasksService.delete).toHaveBeenCalledWith('t1');
    });
  });
});
