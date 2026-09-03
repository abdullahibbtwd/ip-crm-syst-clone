import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.types';
import type { AuditService } from '../../audit/audit.service';
import type { GdprExportService } from '../../compliance/gdpr-export.service';
import type { HistoryService } from '../history/history.service';
import { ClientsController } from './clients.controller';
import type { ClientsService } from './clients.service';

describe('ClientsController', () => {
  const clientsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getSummary: jest.fn(),
    tabCounts: jest.fn(),
    listDeadlines: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
  };
  const historyService = { findByClient: jest.fn() };
  const auditService = { queryDataAccess: jest.fn() };
  const gdprExport = { exportClientBundle: jest.fn() };

  const controller = new ClientsController(
    clientsService as unknown as ClientsService,
    historyService as unknown as HistoryService,
    auditService as unknown as AuditService,
    gdprExport as unknown as GdprExportService,
  );

  const req = {
    user: { userId: 'u1' } as AuthenticatedUser,
  } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('findAll forwards query', async () => {
    await controller.findAll({ search: 'acme' } as never);
    expect(clientsService.findAll).toHaveBeenCalledWith({ search: 'acme' });
  });

  it('findOne / getSummary / tabCounts / listDeadlines forward id', async () => {
    await controller.findOne('c1');
    await controller.getSummary('c1');
    await controller.tabCounts('c1');
    await controller.listDeadlines('c1');
    expect(clientsService.findOne).toHaveBeenCalledWith('c1');
    expect(clientsService.getSummary).toHaveBeenCalledWith('c1');
    expect(clientsService.tabCounts).toHaveBeenCalledWith('c1');
    expect(clientsService.listDeadlines).toHaveBeenCalledWith('c1');
  });

  it('getDataAccess parses limit', async () => {
    await controller.getDataAccess('c1', 'cur', '25');
    expect(auditService.queryDataAccess).toHaveBeenCalledWith('c1', {
      cursor: 'cur',
      limit: 25,
    });
  });

  it('exportClientData forwards client and user', async () => {
    await controller.exportClientData('c1', req);
    expect(gdprExport.exportClientBundle).toHaveBeenCalledWith('c1', req.user);
  });

  it('getHistory forwards pagination', async () => {
    await controller.getHistory('c1', undefined, '10');
    expect(historyService.findByClient).toHaveBeenCalledWith('c1', {
      cursor: undefined,
      limit: 10,
    });
  });

  it('update / archive forward userId', async () => {
    const dto = { name: 'Acme' };
    await controller.update('c1', dto as never, req);
    await controller.archive('c1', req);
    expect(clientsService.update).toHaveBeenCalledWith('c1', dto, 'u1');
    expect(clientsService.archive).toHaveBeenCalledWith('c1', 'u1');
  });
});
