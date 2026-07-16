import { PrismaService } from '../prisma/prisma.service';
import { ConflictCheckService } from './conflict-check.service';

describe('ConflictCheckService', () => {
  let service: ConflictCheckService;
  let prisma: {
    contact: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      contact: { findMany: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };
    service = new ConflictCheckService(prisma as unknown as PrismaService);
  });

  it('returns empty when there are no usable search terms', async () => {
    const hits = await service.runCheck({ companyName: 'A', fullName: 'B' });
    expect(hits).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.contact.findMany).not.toHaveBeenCalled();
  });

  it('adds exact email matches with similarity 1', async () => {
    prisma.contact.findMany.mockResolvedValue([
      {
        id: 'ct1',
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    ]);

    const hits = await service.runCheck({ email: ' Ada@Example.com ' });

    expect(hits).toEqual([
      expect.objectContaining({
        entityType: 'contact',
        entityId: 'ct1',
        matchField: 'email',
        similarity: 1,
      }),
    ]);
  });

  it('adds phone matches with similarity 1', async () => {
    prisma.contact.findMany.mockResolvedValue([
      {
        id: 'ct2',
        phone: '+359888',
        mobile: null,
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    ]);

    const hits = await service.runCheck({ phone: '+359 888' });

    expect(hits).toEqual([
      expect.objectContaining({
        entityType: 'contact',
        entityId: 'ct2',
        matchField: 'phone',
        similarity: 1,
      }),
    ]);
  });
});
