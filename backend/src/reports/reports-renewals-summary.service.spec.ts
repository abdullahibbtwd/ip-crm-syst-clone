import { RenewalStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsRenewalsSummaryService } from './reports-renewals-summary.service';

function renewalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rw-1',
    jurisdiction: 'eu',
    dueDate: new Date('2025-08-01'),
    status: RenewalStatus.upcoming,
    cycleNumber: 1,
    matter: { id: 'm1', title: 'Matter A', matterType: 'trademark' },
    client: {
      id: 'c1',
      companyName: 'Acme',
      firstName: null,
      lastName: null,
      internalCode: 'CL-1',
    },
    ipRight: { title: 'TM-001', registrationNumber: 'REG-1' },
    ...overrides,
  };
}

describe('ReportsRenewalsSummaryService', () => {
  let service: ReportsRenewalsSummaryService;
  let prisma: { renewalWindow: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { renewalWindow: { findMany: jest.fn() } };
    service = new ReportsRenewalsSummaryService(
      prisma as unknown as PrismaService,
    );
  });

  it('returns empty summary when no renewals', async () => {
    prisma.renewalWindow.findMany.mockResolvedValue([]);

    const result = await service.getRenewalsSummary({});

    expect(result.summary.total).toBe(0);
    expect(result.preview).toEqual([]);
    expect(result.byMonth).toEqual([]);
  });

  it('aggregates renewals by status, month, jurisdiction, and urgency', async () => {
    const overdue = renewalRow({
      id: 'rw-overdue',
      dueDate: new Date('2020-01-01'),
      status: RenewalStatus.upcoming,
    });
    const completed = renewalRow({
      id: 'rw-done',
      dueDate: new Date('2026-01-01'),
      status: RenewalStatus.completed,
      jurisdiction: 'us',
    });

    prisma.renewalWindow.findMany.mockResolvedValue([overdue, completed]);

    const result = await service.getRenewalsSummary({
      dueBefore: '2026-12-31',
      jurisdiction: 'eu',
    });

    expect(result.summary.total).toBe(2);
    expect(result.summary.upcoming).toBe(1);
    expect(result.summary.completed).toBe(1);
    expect(result.byStatus.upcoming).toBe(1);
    expect(result.byStatus.completed).toBe(1);
    expect(result.preview[0].clientName).toBe('Acme');
    expect(result.preview[0].urgency).toBe('overdue');
    expect(result.byJurisdiction).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ jurisdiction: 'EU', count: 1 }),
        expect.objectContaining({ jurisdiction: 'US', count: 1 }),
      ]),
    );
  });
});
