import { BadRequestException } from '@nestjs/common';
import { MatterType } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { BillingService } from '../billing/billing.service';
import type { DeadlinesService } from '../deadlines/deadlines.service';
import type { InvoicesService } from '../invoices/invoices.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { MattersService } from './matters.service';
import { TrademarkActionsService } from './trademark-actions.service';

describe('TrademarkActionsService', () => {
  let service: TrademarkActionsService;
  let prisma: {
    $transaction: jest.Mock;
    matterAttributes: { upsert: jest.Mock };
    matterTimelineEvent: { create: jest.Mock };
    matter: { findUniqueOrThrow: jest.Mock };
    matterDocumentVersion: { findFirst: jest.Mock };
  };
  let mattersService: { findOne: jest.Mock };
  let deadlinesService: { createManual: jest.Mock };
  let billingService: { createFixedFee: jest.Mock };
  let invoicesService: { createDraft: jest.Mock };

  const user = {
    userId: 'u1',
    roles: ['ip_attorney'],
    permissions: [],
  } as AuthenticatedUser;

  const trademarkMatter = {
    id: 'm1',
    matterType: MatterType.trademark,
    assignedTo: { id: 'u1' },
    jurisdictions: [{ countryCode: 'BG' }],
    attributes: {
      attributes: {
        niceClasses: ['9'],
        goodsAndServices: [{ classNumber: 9, description: 'software' }],
      },
    },
  };

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn(async (ops) => {
        if (typeof ops === 'function') return ops(prisma);
        return Promise.all(ops);
      }),
      matterAttributes: { upsert: jest.fn() },
      matterTimelineEvent: { create: jest.fn() },
      matter: { findUniqueOrThrow: jest.fn() },
      matterDocumentVersion: { findFirst: jest.fn() },
    };
    mattersService = { findOne: jest.fn() };
    deadlinesService = { createManual: jest.fn() };
    billingService = { createFixedFee: jest.fn() };
    invoicesService = { createDraft: jest.fn() };

    service = new TrademarkActionsService(
      prisma as unknown as PrismaService,
      mattersService as unknown as MattersService,
      deadlinesService as unknown as DeadlinesService,
      billingService as unknown as BillingService,
      invoicesService as unknown as InvoicesService,
    );
  });

  it('rejects non-trademark matters', async () => {
    mattersService.findOne.mockResolvedValue({
      ...trademarkMatter,
      matterType: MatterType.patent,
    });
    await expect(
      service.record('m1', { kind: 'transfer' }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('records a scope correction, updates classes, and writes a timeline note', async () => {
    mattersService.findOne.mockResolvedValue(trademarkMatter);
    prisma.matter.findUniqueOrThrow.mockResolvedValue(trademarkMatter);

    await service.record(
      'm1',
      {
        kind: 'scope_correction',
        goodsAndServices: [
          { classNumber: 9, description: 'computers' },
          { classNumber: 42, description: 'SaaS' },
        ],
        incomingReferenceNumber: 'ВХ-123',
        filingDate: '2026-08-01',
        legalBasis: 'opposition_settlement',
      },
      user,
    );

    expect(prisma.matterAttributes.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          attributes: expect.objectContaining({
            niceClasses: ['9', '42'],
            trademarkActions: [
              expect.objectContaining({
                kind: 'scope_correction',
                id: expect.any(String),
              }),
            ],
          }),
        }),
      }),
    );
    expect(prisma.matterTimelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: 'note',
          title: 'Scope / classes corrected',
        }),
      }),
    );
    expect(deadlinesService.createManual).not.toHaveBeenCalled();
    expect(invoicesService.createDraft).not.toHaveBeenCalled();
  });

  it('creates payment/filing deadlines, reminder deadlines, and a proforma draft', async () => {
    mattersService.findOne.mockResolvedValue(trademarkMatter);
    prisma.matter.findUniqueOrThrow.mockResolvedValue(trademarkMatter);
    deadlinesService.createManual
      .mockResolvedValueOnce({ id: 'd1' })
      .mockResolvedValueOnce({ id: 'd2' })
      .mockResolvedValueOnce({ id: 'd3' })
      .mockResolvedValueOnce({ id: 'd4' });
    billingService.createFixedFee.mockResolvedValue({ id: 'fee1' });
    invoicesService.createDraft.mockResolvedValue({ id: 'inv1' });

    const result = await service.record(
      'm1',
      {
        kind: 'transfer',
        generateProforma: true,
        governmentFeeAmount: 150,
        governmentFeeCurrency: 'EUR',
        paymentDueDate: '2026-09-24',
        paymentReminder: { unit: 'months', amount: 1 },
        filingDeadline: '2026-10-24',
        filingReminder: { unit: 'days', amount: 7 },
      },
      user,
    );

    expect(deadlinesService.createManual).toHaveBeenCalledTimes(4);
    expect(deadlinesService.createManual).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Payment reminder'),
        dueDate: '2026-08-24',
      }),
      'u1',
    );
    expect(deadlinesService.createManual).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Filing reminder'),
        dueDate: '2026-10-17',
      }),
      'u1',
    );
    expect(billingService.createFixedFee).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        amount: 150,
        currency: 'EUR',
        category: 'disbursement',
      }),
    );
    expect(invoicesService.createDraft).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        fixedFeeIds: ['fee1'],
        timeEntryIds: [],
        notes: expect.stringContaining('Proforma'),
      }),
      'u1',
    );
    expect(result.invoiceId).toBe('inv1');
    expect(result.deadlineIds).toEqual(['d1', 'd2', 'd3', 'd4']);
  });

  it('requires a government fee when generating a proforma', async () => {
    mattersService.findOne.mockResolvedValue(trademarkMatter);
    await expect(
      service.record(
        'm1',
        { kind: 'license', generateProforma: true, governmentFeeAmount: 0 },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
