import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { RenewalsService } from '../renewals/renewals.service';
import { MattersController } from './matters.controller';
import type { MattersService } from './matters.service';
import type { TrademarkActionsService } from './trademark-actions.service';

describe('MattersController', () => {
  const mattersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    listDeadlines: jest.fn(),
    tabCounts: jest.fn(),
    listIpRights: jest.fn(),
    createIpRight: jest.fn(),
    fileIpRight: jest.fn(),
  };
  const renewalsService = {
    registerIpRight: jest.fn(),
    listForIpRight: jest.fn(),
    createWindowFromDto: jest.fn(),
  };
  const trademarkActionsService = {
    record: jest.fn(),
  };

  const controller = new MattersController(
    mattersService as unknown as MattersService,
    renewalsService as unknown as RenewalsService,
    trademarkActionsService as unknown as TrademarkActionsService,
  );

  const user = {
    userId: 'u1',
    roles: ['ip_attorney'],
  } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('create / findAll / findOne / update / remove', async () => {
    const createDto = { title: 'M' };
    const query = { status: 'open' };
    const updateDto = { title: 'M2' };

    await controller.create(createDto as never, req);
    await controller.findAll(query as never, req);
    await controller.findOne('m1', req);
    await controller.update('m1', updateDto as never, req);
    await controller.remove('m1');

    expect(mattersService.create).toHaveBeenCalledWith(createDto, 'u1');
    expect(mattersService.findAll).toHaveBeenCalledWith(query, user);
    expect(mattersService.findOne).toHaveBeenCalledWith('m1', user);
    expect(mattersService.update).toHaveBeenCalledWith('m1', updateDto, user);
    expect(mattersService.remove).toHaveBeenCalledWith('m1');
  });

  it('tabCounts / listDeadlines / listIpRights / createIpRight / fileIpRight', async () => {
    const ipDto = { title: 'Mark' };
    const fileDto = { filingDate: '2026-01-01' };

    await controller.tabCounts('m1', req);
    await controller.listDeadlines('m1', req);
    await controller.listIpRights('m1', req);
    await controller.createIpRight('m1', ipDto as never);
    await controller.fileIpRight('m1', 'ip1', fileDto as never, req);

    expect(mattersService.tabCounts).toHaveBeenCalledWith('m1', user);
    expect(mattersService.listDeadlines).toHaveBeenCalledWith('m1', user);
    expect(mattersService.listIpRights).toHaveBeenCalledWith('m1', user);
    expect(mattersService.createIpRight).toHaveBeenCalledWith('m1', ipDto);
    expect(mattersService.fileIpRight).toHaveBeenCalledWith(
      'm1',
      'ip1',
      fileDto,
      'u1',
    );
  });

  it('renewals endpoints forward to RenewalsService', async () => {
    const regDto = { registrationDate: '2026-01-01' };
    const winDto = { dueDate: '2026-08-01' };

    await controller.registerIpRight('m1', 'ip1', regDto as never, req);
    await controller.listIpRightRenewals('m1', 'ip1');
    await controller.createIpRightRenewal('m1', 'ip1', winDto as never, req);

    expect(renewalsService.registerIpRight).toHaveBeenCalledWith(
      'm1',
      'ip1',
      regDto,
      'u1',
    );
    expect(renewalsService.listForIpRight).toHaveBeenCalledWith('m1', 'ip1');
    expect(renewalsService.createWindowFromDto).toHaveBeenCalledWith(
      'm1',
      'ip1',
      winDto,
      'u1',
    );
  });

  it('recordTrademarkAction forwards to TrademarkActionsService', async () => {
    const dto = { kind: 'transfer' };
    await controller.recordTrademarkAction('m1', dto as never, req);
    expect(trademarkActionsService.record).toHaveBeenCalledWith('m1', dto, user);
  });
});
