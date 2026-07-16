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
    service = new WatchService(
      prisma as unknown as PrismaService,
      {} as never,
      {
        notifyAlertCreated: jest.fn(),
        notifyAlertTriaged: jest.fn(),
      } as never,
    );
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

  it('createMockAlert requires a profile', async () => {
    prisma.watchProfile.findUnique.mockResolvedValue(null);
    prisma.watchProfile.findFirst.mockResolvedValue(null);
    await expect(
      service.createMockAlert({ clientId: 'c1' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
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
