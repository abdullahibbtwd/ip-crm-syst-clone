import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { DeadlineExplanationService } from './deadline-explanation.service';
import { DeadlinesController } from './deadlines.controller';
import type { DeadlinesService } from './deadlines.service';
import { DeadlineRulesController } from './deadline-rules.controller';
import type { DeadlineRulesService } from './deadline-rules.service';
import { HolidaysController } from './holidays.controller';
import type { HolidaysService } from './holidays.service';

describe('Deadlines controllers', () => {
  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  describe('DeadlinesController', () => {
    const deadlinesService = {
      listAllDeadlines: jest.fn(),
      countDueTodayForUser: jest.fn(),
      countDueToday: jest.fn(),
      listMyDeadlines: jest.fn(),
      createManual: jest.fn(),
      updateStatus: jest.fn(),
    };
    const explanationService = { explain: jest.fn() };
    const controller = new DeadlinesController(
      deadlinesService as unknown as DeadlinesService,
      explanationService as unknown as DeadlineExplanationService,
    );

    it('list / counts / my / explanation / create / updateStatus', async () => {
      const query = { status: 'open' };
      const myQuery = { limit: 5 };
      const createDto = { title: 'D' };

      await controller.listAll(query as never);
      await controller.countMyDueToday(req);
      await controller.countAllDueToday();
      await controller.listMy(myQuery as never, req);
      await controller.explanation('d1');
      await controller.create(createDto as never, req);
      await controller.updateStatus('d1', { status: 'completed' } as never, req);

      expect(deadlinesService.listAllDeadlines).toHaveBeenCalledWith(query);
      expect(deadlinesService.countDueTodayForUser).toHaveBeenCalledWith(user);
      expect(deadlinesService.countDueToday).toHaveBeenCalled();
      expect(deadlinesService.listMyDeadlines).toHaveBeenCalledWith(
        user,
        myQuery,
      );
      expect(explanationService.explain).toHaveBeenCalledWith('d1');
      expect(deadlinesService.createManual).toHaveBeenCalledWith(
        createDto,
        'u1',
      );
      expect(deadlinesService.updateStatus).toHaveBeenCalledWith(
        'd1',
        'completed',
        'u1',
      );
    });
  });

  describe('DeadlineRulesController', () => {
    const rules = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };
    const controller = new DeadlineRulesController(
      rules as unknown as DeadlineRulesService,
    );

    it('CRUD forwards', async () => {
      const dto = { name: 'Rule' };
      await controller.list({} as never);
      await controller.findOne('r1');
      await controller.create(dto as never);
      await controller.update('r1', dto as never);
      await controller.deactivate('r1');

      expect(rules.list).toHaveBeenCalled();
      expect(rules.findById).toHaveBeenCalledWith('r1');
      expect(rules.create).toHaveBeenCalledWith(dto);
      expect(rules.update).toHaveBeenCalledWith('r1', dto);
      expect(rules.deactivate).toHaveBeenCalledWith('r1');
    });
  });

  describe('HolidaysController', () => {
    const holidays = {
      list: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    const controller = new HolidaysController(
      holidays as unknown as HolidaysService,
    );

    it('CRUD forwards', async () => {
      const dto = { name: 'NYD', date: '2026-01-01' };
      await controller.list({} as never);
      await controller.findOne('h1');
      await controller.create(dto as never, req);
      await controller.update('h1', dto as never);
      await controller.remove('h1');

      expect(holidays.list).toHaveBeenCalled();
      expect(holidays.findById).toHaveBeenCalledWith('h1');
      expect(holidays.create).toHaveBeenCalledWith(dto, 'u1');
      expect(holidays.update).toHaveBeenCalledWith('h1', dto);
      expect(holidays.remove).toHaveBeenCalledWith('h1');
    });
  });
});
