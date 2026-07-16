import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import type { AccountingExportService } from './accounting-export.service';
import {
  InvoicesController,
  MatterInvoicesController,
  PortalInvoicesController,
} from './invoices.controller';
import type { InvoicesService } from './invoices.service';

describe('Invoices controllers', () => {
  const invoices = {
    listForMatter: jest.fn(),
    createDraft: jest.fn(),
    listAll: jest.fn(),
    getPdfDownload: jest.fn(),
    findOne: jest.fn(),
    updateDraft: jest.fn(),
    issue: jest.fn(),
    voidInvoice: jest.fn(),
    recordPayment: jest.fn(),
    listForPortalClient: jest.fn(),
  };
  const accountingExport = { export: jest.fn() };
  const portalAccess = { requireScopeClientId: jest.fn() };

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('MatterInvoicesController', async () => {
    const c = new MatterInvoicesController(
      invoices as unknown as InvoicesService,
    );
    await c.list('m1');
    await c.create('m1', {} as never, req);
    expect(invoices.listForMatter).toHaveBeenCalledWith('m1');
    expect(invoices.createDraft).toHaveBeenCalledWith('m1', {}, 'u1');
  });

  it('InvoicesController', async () => {
    const c = new InvoicesController(
      invoices as unknown as InvoicesService,
      accountingExport as unknown as AccountingExportService,
    );
    const query = { status: 'draft' };
    const payDto = { amount: 100 };

    await c.listAll(query as never);
    await c.exportAccounting({} as never);
    await c.getPdf('inv1', req);
    await c.findOne('inv1', req);
    await c.update('inv1', { notes: 'n' } as never);
    await c.issue('inv1');
    await c.void('inv1');
    await c.recordPayment('inv1', payDto as never, req);

    expect(invoices.listAll).toHaveBeenCalledWith(query);
    expect(accountingExport.export).toHaveBeenCalled();
    expect(invoices.getPdfDownload).toHaveBeenCalledWith('inv1', user);
    expect(invoices.findOne).toHaveBeenCalledWith('inv1', user);
    expect(invoices.updateDraft).toHaveBeenCalledWith('inv1', { notes: 'n' });
    expect(invoices.issue).toHaveBeenCalledWith('inv1');
    expect(invoices.voidInvoice).toHaveBeenCalledWith('inv1');
    expect(invoices.recordPayment).toHaveBeenCalledWith('inv1', payDto, 'u1');
  });

  it('PortalInvoicesController', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    const c = new PortalInvoicesController(
      invoices as unknown as InvoicesService,
      portalAccess as unknown as PortalAccessService,
    );

    await c.list(req);
    await c.getPdf('inv1', req);
    await c.findOne('inv1', req);

    expect(portalAccess.requireScopeClientId).toHaveBeenCalledWith(user);
    expect(invoices.listForPortalClient).toHaveBeenCalledWith('c1');
    expect(invoices.getPdfDownload).toHaveBeenCalledWith('inv1', user);
    expect(invoices.findOne).toHaveBeenCalledWith('inv1', user);
  });
});
