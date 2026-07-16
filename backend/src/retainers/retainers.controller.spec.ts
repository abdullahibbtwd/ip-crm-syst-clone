import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import {
  ClientRetainerController,
  InvoiceRetainerController,
  PortalRetainerController,
} from './retainers.controller';
import type { RetainersService } from './retainers.service';

describe('Retainers controllers', () => {
  const retainers = {
    getByClientId: jest.fn(),
    recordDeposit: jest.fn(),
    recordAdjustment: jest.fn(),
    applyToInvoice: jest.fn(),
    getPortalBalance: jest.fn(),
  };
  const portalAccess = { requireScopeClientId: jest.fn() };

  const user = { userId: 'u1' } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('ClientRetainerController', async () => {
    const c = new ClientRetainerController(
      retainers as unknown as RetainersService,
    );
    const depositDto = { amount: 500 };
    const adjustDto = { amount: -50, reason: 'correction' };

    await c.get('c1');
    await c.deposit('c1', depositDto as never, req);
    await c.adjust('c1', adjustDto as never, req);

    expect(retainers.getByClientId).toHaveBeenCalledWith('c1');
    expect(retainers.recordDeposit).toHaveBeenCalledWith(
      'c1',
      depositDto,
      'u1',
    );
    expect(retainers.recordAdjustment).toHaveBeenCalledWith(
      'c1',
      adjustDto,
      'u1',
    );
  });

  it('InvoiceRetainerController', async () => {
    const c = new InvoiceRetainerController(
      retainers as unknown as RetainersService,
    );
    const dto = { amount: 200 };

    await c.apply('inv1', dto as never, req);
    expect(retainers.applyToInvoice).toHaveBeenCalledWith('inv1', dto, 'u1');
  });

  it('PortalRetainerController', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    const c = new PortalRetainerController(
      retainers as unknown as RetainersService,
      portalAccess as unknown as PortalAccessService,
    );

    await c.get(req);
    expect(portalAccess.requireScopeClientId).toHaveBeenCalledWith(user);
    expect(retainers.getPortalBalance).toHaveBeenCalledWith('c1');
  });
});
