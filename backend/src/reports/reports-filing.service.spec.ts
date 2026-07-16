import { MatterTimelineEventType } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsFilingService } from './reports-filing.service';

describe('ReportsFilingService', () => {
  let service: ReportsFilingService;
  let prisma: { matterTimelineEvent: { findMany: jest.Mock } };

  beforeEach(() => {
    prisma = { matterTimelineEvent: { findMany: jest.fn() } };
    service = new ReportsFilingService(prisma as unknown as PrismaService);
  });

  it('returns empty summary when no filing events', async () => {
    prisma.matterTimelineEvent.findMany.mockResolvedValue([]);

    const result = await service.getFilingVolumes({});

    expect(result.summary.totalFilings).toBe(0);
    expect(result.byMonth).toEqual([]);
    expect(result.preview).toEqual([]);
    expect(prisma.matterTimelineEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          eventType: MatterTimelineEventType.filing,
        }),
      }),
    );
  });

  it('aggregates filings by month, matter type, and jurisdiction', async () => {
    const occurredAt = new Date('2025-06-15T10:00:00.000Z');
    prisma.matterTimelineEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        title: 'TM filing',
        occurredAt,
        metadata: { jurisdiction: 'eu' },
        matter: { id: 'm1', title: 'Matter A', matterType: 'trademark' },
        ipRight: { jurisdiction: 'US' },
      },
      {
        id: 'e2',
        title: 'Patent filing',
        occurredAt,
        metadata: null,
        matter: { id: 'm2', title: 'Matter B', matterType: 'patent' },
        ipRight: { jurisdiction: 'de' },
      },
    ]);

    const result = await service.getFilingVolumes({
      from: '2025-01-01',
      to: '2025-12-31',
    });

    expect(result.summary.totalFilings).toBe(2);
    expect(result.summary.byMatterType).toEqual({
      trademark: 1,
      patent: 1,
    });
    expect(result.summary.byJurisdiction).toEqual({
      EU: 1,
      DE: 1,
    });
    expect(result.byMonth).toHaveLength(1);
    expect(result.byMonth[0].month).toBe('2025-06');
    expect(result.preview[0].jurisdiction).toBe('EU');
  });

  it('filters by jurisdiction when query.jurisdiction is set', async () => {
    const occurredAt = new Date('2025-03-01T00:00:00.000Z');
    prisma.matterTimelineEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        title: 'EU filing',
        occurredAt,
        metadata: { jurisdiction: 'EU' },
        matter: { id: 'm1', title: 'Matter', matterType: 'trademark' },
        ipRight: null,
      },
      {
        id: 'e2',
        title: 'US filing',
        occurredAt,
        metadata: { jurisdiction: 'US' },
        matter: { id: 'm2', title: 'Other', matterType: 'patent' },
        ipRight: null,
      },
    ]);

    const result = await service.getFilingVolumes({ jurisdiction: 'eu' });

    expect(result.summary.totalFilings).toBe(1);
    expect(result.preview[0].jurisdiction).toBe('EU');
  });
});
