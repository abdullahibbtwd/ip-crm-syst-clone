import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RenewalsController } from './renewals.controller';
import type { RenewalsService } from './renewals.service';

describe('RenewalsController', () => {
  const renewals = {
    listMy: jest.fn(),
    listAll: jest.fn(),
    listParts: jest.fn(),
    splitWindow: jest.fn(),
    instructPart: jest.fn(),
    markPartFiled: jest.fn(),
    recordPartPayment: jest.fn(),
    completePart: jest.fn(),
    findOne: jest.fn(),
    instruct: jest.fn(),
    markFiled: jest.fn(),
    complete: jest.fn(),
  };

  const controller = new RenewalsController(
    renewals as unknown as RenewalsService,
  );

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('listMy / listAll forward query', async () => {
    const query = { limit: 10 };
    await controller.listMy(query as never, req);
    await controller.listAll(query as never);
    expect(renewals.listMy).toHaveBeenCalledWith(user, query);
    expect(renewals.listAll).toHaveBeenCalledWith(query);
  });

  it('listParts forwards windowId', async () => {
    await controller.listParts('w1');
    expect(renewals.listParts).toHaveBeenCalledWith('w1');
  });

  it('splitWindow forwards args', async () => {
    const dto = { parts: [{ dueDate: '2026-01-01' }] };
    await controller.splitWindow('w1', dto as never, req);
    expect(renewals.splitWindow).toHaveBeenCalledWith('w1', dto.parts, 'u1');
  });

  it('part workflow forwards partId and userId', async () => {
    const instructDto = { notes: 'go' };
    const paymentDto = { amount: 100 };
    const completeDto = { notes: 'done' };

    await controller.instructPart('p1', instructDto as never, req);
    await controller.markPartFiled('p1', req);
    await controller.recordPartPayment('p1', paymentDto as never, req);
    await controller.completePart('p1', completeDto as never, req);

    expect(renewals.instructPart).toHaveBeenCalledWith('p1', instructDto, 'u1');
    expect(renewals.markPartFiled).toHaveBeenCalledWith('p1', 'u1');
    expect(renewals.recordPartPayment).toHaveBeenCalledWith(
      'p1',
      paymentDto,
      'u1',
    );
    expect(renewals.completePart).toHaveBeenCalledWith(
      'p1',
      completeDto,
      'u1',
    );
  });

  it('findOne / renewal workflow forwards id and userId', async () => {
    const instructDto = { notes: 'go' };
    const completeDto = { notes: 'done' };

    await controller.findOne('r1');
    await controller.instruct('r1', instructDto as never, req);
    await controller.markFiled('r1', req);
    await controller.complete('r1', completeDto as never, req);

    expect(renewals.findOne).toHaveBeenCalledWith('r1');
    expect(renewals.instruct).toHaveBeenCalledWith('r1', instructDto, 'u1');
    expect(renewals.markFiled).toHaveBeenCalledWith('r1', 'u1');
    expect(renewals.complete).toHaveBeenCalledWith('r1', completeDto, 'u1');
  });
});
