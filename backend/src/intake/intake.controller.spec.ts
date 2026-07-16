import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { IntakeController } from './intake.controller';
import type { IntakeService } from './intake.service';

describe('IntakeController', () => {
  const intakeService = {
    create: jest.fn(),
    findAll: jest.fn(),
    countPending: jest.fn(),
    findOneForUser: jest.fn(),
    updateOwn: jest.fn(),
    update: jest.fn(),
    addCounterparty: jest.fn(),
    removeCounterparty: jest.fn(),
    runConflictCheck: jest.fn(),
    resolveConflict: jest.fn(),
    convert: jest.fn(),
  };
  const controller = new IntakeController(
    intakeService as unknown as IntakeService,
  );
  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('forwards create / list / pending / findOne / updateOwn', async () => {
    const dto = { email: 'a@x.com' };
    await controller.create(dto as never, req);
    await controller.findAll({ status: 'new' } as never, req);
    await controller.pendingCount(req);
    await controller.findOne('i1', req);
    await controller.updateOwn('i1', dto as never, req);

    expect(intakeService.create).toHaveBeenCalledWith(dto, user);
    expect(intakeService.findAll).toHaveBeenCalledWith({ status: 'new' }, user);
    expect(intakeService.countPending).toHaveBeenCalledWith(user);
    expect(intakeService.findOneForUser).toHaveBeenCalledWith('i1', user);
    expect(intakeService.updateOwn).toHaveBeenCalledWith('i1', dto, user);
  });

  it('forwards update / counterparties / conflict / convert', async () => {
    await controller.update('i1', { notes: 'n' } as never);
    await controller.addCounterparty('i1', { name: 'C' } as never);
    await controller.removeCounterparty('i1', 'cp1');
    await controller.runConflictCheck('i1');
    await controller.resolveConflict(
      'i1',
      { resolution: 'cleared' } as never,
      req,
    );
    await controller.convert('i1', {} as never, req);

    expect(intakeService.update).toHaveBeenCalledWith('i1', { notes: 'n' });
    expect(intakeService.addCounterparty).toHaveBeenCalledWith('i1', {
      name: 'C',
    });
    expect(intakeService.removeCounterparty).toHaveBeenCalledWith('i1', 'cp1');
    expect(intakeService.runConflictCheck).toHaveBeenCalledWith('i1');
    expect(intakeService.resolveConflict).toHaveBeenCalledWith(
      'i1',
      { resolution: 'cleared' },
      'u1',
    );
    expect(intakeService.convert).toHaveBeenCalledWith('i1', {}, user);
  });
});
