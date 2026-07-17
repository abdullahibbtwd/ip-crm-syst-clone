import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  WatchAlertStatus,
  WatchProfileStatus,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WatchService } from './watch.service';
import { scoreMarkSimilarity } from './watch-similarity.util';

describe('WatchService', () => {
  let service: WatchService;
  let prisma: Record<string, any>;
  let matters: { create: jest.Mock };
  let alertNotify: {
    notifyAlertCreated: jest.Mock;
    notifyAlertTriaged: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      client: { findUnique: jest.fn() },
      watchProfile: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      watchAlert: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    matters = { create: jest.fn() };
    alertNotify = {
      notifyAlertCreated: jest.fn(),
      notifyAlertTriaged: jest.fn(),
    };
    service = new WatchService(
      prisma as unknown as PrismaService,
      matters as never,
      alertNotify as never,
    );
  });

  it('listProfilesForClient returns profiles', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.watchProfile.findMany.mockResolvedValue([{ id: 'p1' }]);

    await expect(service.listProfilesForClient('c1')).resolves.toEqual({
      items: [{ id: 'p1' }],
    });
  });

  it('listProfilesForClient requires client', async () => {
    prisma.client.findUnique.mockResolvedValue(null);
    await expect(service.listProfilesForClient('c1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createProfile / updateProfile', async () => {
    prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
    prisma.watchProfile.create.mockResolvedValue({ id: 'p1' });
    prisma.watchProfile.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.watchProfile.update.mockResolvedValue({
      id: 'p1',
      status: WatchProfileStatus.paused,
    });

    await service.createProfile(
      'c1',
      {
        markText: ' ACME ',
        jurisdictions: ['eu'],
        niceClasses: [9],
        frequency: 'weekly',
      } as never,
      'u1',
    );
    expect(prisma.watchProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          markText: 'ACME',
          jurisdictions: ['EU'],
        }),
      }),
    );

    await service.updateProfile('p1', {
      status: WatchProfileStatus.paused,
    } as never);

    prisma.watchProfile.findUnique.mockResolvedValue(null);
    await expect(
      service.updateProfile('missing', {
        status: WatchProfileStatus.active,
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listAlerts returns cursor page + stats', async () => {
    prisma.watchAlert.findMany.mockResolvedValue([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ]);
    prisma.watchAlert.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2);

    const result = await service.listAlerts({ limit: 2 } as never);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('2');
    expect(result.newCount).toBe(1);
  });

  it('findAlert / rejectAlert', async () => {
    prisma.watchAlert.findUnique.mockResolvedValueOnce(null);
    await expect(service.findAlert('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.watchAlert.findUnique.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.new,
    });
    prisma.watchAlert.update.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.rejected,
    });
    await service.rejectAlert('a1', 'u1');

    prisma.watchAlert.findUnique.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.rejected,
    });
    await expect(service.rejectAlert('a1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findAlert returns alert when present', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue({ id: 'a1' });
    await expect(service.findAlert('a1')).resolves.toEqual({ id: 'a1' });
  });

  it('createMockAlert creates alert and notifies', async () => {
    prisma.watchProfile.findFirst.mockResolvedValue({
      id: 'p1',
      clientId: 'c1',
      markText: 'ACME',
      jurisdictions: ['EU'],
    });
    prisma.$queryRaw.mockResolvedValue([{ score: 0.75 }]);
    prisma.watchAlert.create.mockResolvedValue({ id: 'a1' });

    await service.createMockAlert({ clientId: 'c1' } as never);

    expect(prisma.watchAlert.create).toHaveBeenCalled();
    expect(alertNotify.notifyAlertCreated).toHaveBeenCalledWith('a1');
  });

  it('acceptAlert creates opposition matter and triages alert', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.new,
      clientId: 'c1',
      conflictingMark: 'Koka-Cola',
      source: 'EUIPO',
      applicationNumber: '123',
      jurisdiction: 'EU',
      watchProfile: { markText: 'ACME', jurisdictions: ['EU'] },
      client: { assignedUserId: 'u2' },
    });
    matters.create.mockResolvedValue({ id: 'm1' });
    prisma.watchAlert.update.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.accepted,
    });

    const result = await service.acceptAlert('a1', 'u1');

    expect(matters.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        title: 'Opposition: Koka-Cola',
      }),
      'u1',
    );
    expect(result.matter.id).toBe('m1');
    expect(alertNotify.notifyAlertTriaged).toHaveBeenCalledWith(
      'a1',
      'accepted',
    );
  });

  it('acceptAlert rejects already triaged alerts', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue({
      id: 'a1',
      status: WatchAlertStatus.rejected,
    });

    await expect(service.acceptAlert('a1', 'u1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejectAlert throws when alert is missing', async () => {
    prisma.watchAlert.findUnique.mockResolvedValue(null);
    await expect(service.rejectAlert('missing', 'u1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('createMockAlert requires a profile', async () => {
    prisma.watchProfile.findUnique.mockResolvedValue(null);
    prisma.watchProfile.findFirst.mockResolvedValue(null);
    await expect(
      service.createMockAlert({ clientId: 'c1' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createMockAlert rejects invalid jurisdiction', async () => {
    prisma.watchProfile.findFirst.mockResolvedValue({
      id: 'p1',
      clientId: 'c1',
      markText: 'ACME',
      jurisdictions: ['EU'],
    });

    await expect(
      service.createMockAlert({
        clientId: 'c1',
        jurisdiction: 'INVALID',
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listAlerts without cursor returns stats only page', async () => {
    prisma.watchAlert.findMany.mockResolvedValue([{ id: '1' }]);
    prisma.watchAlert.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await service.listAlerts({ limit: 10 } as never);
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
    expect(result.newCount).toBe(0);
  });

  describe('extended branch coverage', () => {
    it('updateProfile rejects missing profile', async () => {
      prisma.watchProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile('missing', { status: WatchProfileStatus.paused }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('listAlerts applies clientId and status filters', async () => {
      prisma.watchAlert.findMany.mockResolvedValue([]);
      prisma.watchAlert.count.mockResolvedValue(0);
      await service.listAlerts({
        clientId: 'c1',
        status: WatchAlertStatus.new,
        limit: 5,
      } as never);
      expect(prisma.watchAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            status: WatchAlertStatus.new,
          }),
        }),
      );
    });

    it('acceptAlert rejects when alert is missing', async () => {
      prisma.watchAlert.findUnique.mockResolvedValue(null);
      await expect(service.acceptAlert('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('createProfile normalizes jurisdictions to uppercase', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.watchProfile.create.mockResolvedValue({ id: 'wp1' });
      await service.createProfile(
        'c1',
        {
          markText: 'ACME',
          jurisdictions: ['eu', 'de'],
          frequency: 'weekly',
        } as never,
        'u1',
      );
      expect(prisma.watchProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ jurisdictions: ['EU', 'DE'] }),
        }),
      );
    });

    it('rejectAlert rejects already accepted alerts', async () => {
      prisma.watchAlert.findUnique.mockResolvedValue({
        id: 'a1',
        status: WatchAlertStatus.accepted,
      });
      await expect(service.rejectAlert('a1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('listAlerts returns nextCursor when more rows exist', async () => {
      prisma.watchAlert.findMany.mockResolvedValue([
        { id: 'a1' },
        { id: 'a2' },
        { id: 'a3' },
      ]);
      prisma.watchAlert.count.mockResolvedValue(1);
      const result = await service.listAlerts({ limit: 2 } as never);
      expect(result.nextCursor).toBe('a2');
    });

    it('createMockAlert creates alert for valid profile and jurisdiction', async () => {
      prisma.watchProfile.findFirst.mockResolvedValue({
        id: 'p1',
        clientId: 'c1',
        markText: 'ACME',
        jurisdictions: ['EU'],
      });
      prisma.$queryRaw.mockResolvedValue([{ score: 0.75 }]);
      prisma.watchAlert.create.mockResolvedValue({ id: 'a1' });
      alertNotify.notifyAlertCreated.mockResolvedValue(undefined);

      const alert = await service.createMockAlert({
        clientId: 'c1',
        jurisdiction: 'EU',
        conflictingMark: 'ACME CLONE',
      } as never);

      expect(alert.id).toBe('a1');
      expect(alertNotify.notifyAlertCreated).toHaveBeenCalledWith('a1');
    });

    it('findAlert returns alert with profile', async () => {
      prisma.watchAlert.findUnique.mockResolvedValue({
        id: 'a1',
        status: WatchAlertStatus.new,
        watchProfile: { id: 'p1', markText: 'ACME' },
      });
      const alert = await service.findAlert('a1');
      expect(alert.watchProfile.markText).toBe('ACME');
    });

    it('listAlerts applies jurisdiction source and similarity filters', async () => {
      prisma.watchAlert.findMany.mockResolvedValue([]);
      prisma.watchAlert.count.mockResolvedValue(0);
      await service.listAlerts({
        jurisdiction: 'EU',
        source: 'euipo',
        minSimilarity: 0.7,
        sortBy: 'similarity',
        limit: 10,
      } as never);
      expect(prisma.watchAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            jurisdiction: 'EU',
            source: 'euipo',
            similarityScore: { gte: 0.7 },
          }),
          orderBy: expect.arrayContaining([
            expect.objectContaining({ similarityScore: expect.any(Object) }),
          ]),
        }),
      );
    });

    it('createProfile defaults niceClasses to empty array', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.watchProfile.create.mockResolvedValue({ id: 'wp1', niceClasses: [] });
      await service.createProfile(
        'c1',
        {
          markText: 'BRAND',
          jurisdictions: ['EU'],
          frequency: 'weekly',
        } as never,
        'u1',
      );
      expect(prisma.watchProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ niceClasses: [] }),
        }),
      );
    });
  });
});

describe('scoreMarkSimilarity', () => {
  it('returns null for empty sides', async () => {
    await expect(
      scoreMarkSimilarity(' ', 'x', {} as never),
    ).resolves.toBeNull();
  });

  it('reads score from prisma', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ score: 0.82 }]),
    };
    await expect(
      scoreMarkSimilarity('acme', 'acmi', prisma as never),
    ).resolves.toBe(0.82);
  });
});
