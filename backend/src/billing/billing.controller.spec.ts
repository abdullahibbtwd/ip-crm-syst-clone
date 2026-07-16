import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BillingOverviewService } from './billing-overview.service';
import { BillingOverviewController } from './billing-overview.controller';
import {
  ClientBillingSummaryController,
  FixedFeesController,
  MatterBillingSummaryController,
  MatterFixedFeesController,
  MatterTimeEntriesController,
  RateCardsController,
  TimeEntriesController,
} from './billing.controller';
import type { BillingService } from './billing.service';

describe('Billing controllers', () => {
  const billing = {
    listRateCards: jest.fn(),
    resolveRate: jest.fn(),
    createRateCard: jest.fn(),
    updateRateCard: jest.fn(),
    listTimeEntries: jest.fn(),
    createTimeEntry: jest.fn(),
    listAllTimeEntries: jest.fn(),
    updateTimeEntry: jest.fn(),
    deleteTimeEntry: jest.fn(),
    listFixedFees: jest.fn(),
    createFixedFee: jest.fn(),
    listAllFixedFees: jest.fn(),
    updateFixedFee: jest.fn(),
    deleteFixedFee: jest.fn(),
    getBillingSummary: jest.fn(),
    getClientBillingSummary: jest.fn(),
  };
  const overview = { getOverview: jest.fn() };

  const user = {
    userId: 'u1',
    roles: ['ip_attorney'],
  } as AuthenticatedUser;
  const req = { user } as Request;

  beforeEach(() => jest.clearAllMocks());

  it('RateCardsController', async () => {
    const c = new RateCardsController(billing as unknown as BillingService);
    await c.list();
    await c.resolve({ matterId: 'm1', role: 'ip_attorney' } as never, req);
    await c.create({ hourlyRate: 200 } as never);
    await c.update('rc1', { hourlyRate: 220 } as never);

    expect(billing.listRateCards).toHaveBeenCalled();
    expect(billing.resolveRate).toHaveBeenCalledWith(
      'm1',
      ['ip_attorney'],
      'ip_attorney',
    );
    expect(billing.createRateCard).toHaveBeenCalled();
    expect(billing.updateRateCard).toHaveBeenCalledWith('rc1', {
      hourlyRate: 220,
    });
  });

  it('MatterTimeEntriesController / TimeEntriesController', async () => {
    const matterC = new MatterTimeEntriesController(
      billing as unknown as BillingService,
    );
    const timeC = new TimeEntriesController(
      billing as unknown as BillingService,
    );

    await matterC.list('m1');
    await matterC.create('m1', { hours: 1 } as never, req);
    await timeC.listAll('m1', 'u1', '2026-01-01', '2026-12-31', '50');
    await timeC.update('te1', { hours: 2 } as never);
    await timeC.remove('te1');

    expect(billing.listTimeEntries).toHaveBeenCalledWith('m1');
    expect(billing.createTimeEntry).toHaveBeenCalledWith(
      'm1',
      { hours: 1 },
      'u1',
      ['ip_attorney'],
    );
    expect(billing.listAllTimeEntries).toHaveBeenCalledWith({
      matterId: 'm1',
      loggedById: 'u1',
      from: '2026-01-01',
      to: '2026-12-31',
      limit: 50,
    });
    expect(billing.updateTimeEntry).toHaveBeenCalledWith('te1', { hours: 2 });
    expect(billing.deleteTimeEntry).toHaveBeenCalledWith('te1');
  });

  it('Fixed fees + billing summaries + overview', async () => {
    const matterFees = new MatterFixedFeesController(
      billing as unknown as BillingService,
    );
    const fees = new FixedFeesController(billing as unknown as BillingService);
    const matterSum = new MatterBillingSummaryController(
      billing as unknown as BillingService,
    );
    const clientSum = new ClientBillingSummaryController(
      billing as unknown as BillingService,
    );
    const overviewC = new BillingOverviewController(
      overview as unknown as BillingOverviewService,
    );

    await matterFees.list('m1');
    await matterFees.create('m1', { amount: 100 } as never);
    await fees.listAll('filing', 'm1', undefined, undefined, '20');
    await fees.update('ff1', { amount: 150 } as never);
    await fees.remove('ff1');
    await matterSum.get('m1');
    await clientSum.get('c1');
    await overviewC.getOverview();

    expect(billing.listFixedFees).toHaveBeenCalledWith('m1');
    expect(billing.createFixedFee).toHaveBeenCalledWith('m1', { amount: 100 });
    expect(billing.listAllFixedFees).toHaveBeenCalledWith({
      category: 'filing',
      matterId: 'm1',
      from: undefined,
      to: undefined,
      limit: 20,
    });
    expect(billing.updateFixedFee).toHaveBeenCalledWith('ff1', { amount: 150 });
    expect(billing.deleteFixedFee).toHaveBeenCalledWith('ff1');
    expect(billing.getBillingSummary).toHaveBeenCalledWith('m1');
    expect(billing.getClientBillingSummary).toHaveBeenCalledWith('c1');
    expect(overview.getOverview).toHaveBeenCalled();
  });
});
