import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  WatchAlertStatus,
  WatchProfileStatus,
  WatchRegistrySource,
} from '../../generated/prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { WatchAlertNotifyService } from '../watch/watch-alert-notify.service';
import type { EpoProvider } from './providers/epo.provider';
import { RegistryScanService } from './registry-scan.service';

jest.mock('../watch/watch-similarity.util', () => ({
  scoreMarkSimilarity: jest.fn().mockResolvedValue(0.85),
  WATCH_MATCH_METHOD: 'fuzzy',
}));

describe('RegistryScanService', () => {
  let service: RegistryScanService;
  let prisma: {
    watchProfile: { findMany: jest.Mock };
    watchAlert: { findFirst: jest.Mock; create: jest.Mock };
  };
  let epo: {
    isConfigured: jest.Mock;
    searchPublishedData: jest.Mock;
  };
  let alertNotify: { notifyAlertCreated: jest.Mock };

  beforeEach(() => {
    prisma = {
      watchProfile: { findMany: jest.fn() },
      watchAlert: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'a1' }),
      },
    };
    epo = {
      isConfigured: jest.fn().mockReturnValue(true),
      searchPublishedData: jest.fn(),
    };
    alertNotify = { notifyAlertCreated: jest.fn().mockResolvedValue(undefined) };

    service = new RegistryScanService(
      prisma as unknown as PrismaService,
      epo as unknown as EpoProvider,
      alertNotify as unknown as WatchAlertNotifyService,
    );
  });

  it('scanEpoWatchProfiles returns early when EPO is not configured', async () => {
    epo.isConfigured.mockReturnValue(false);
    const result = await service.scanEpoWatchProfiles();
    expect(result.success).toBe(false);
    expect(result.profilesScanned).toBe(0);
    expect(result.message).toContain('not configured');
  });

  it('scanEpoWatchProfiles handles no active EP profiles', async () => {
    prisma.watchProfile.findMany.mockResolvedValue([]);
    const result = await service.scanEpoWatchProfiles();
    expect(result).toMatchObject({
      success: true,
      profilesScanned: 0,
      alertsCreated: 0,
    });
    expect(result.message).toContain('No active EP watch profiles');
  });

  it('scanEpoWatchProfiles creates alerts for new hits', async () => {
    prisma.watchProfile.findMany.mockResolvedValue([
      {
        id: 'wp1',
        clientId: 'cl1',
        markText: 'WIDGET',
        jurisdictions: ['EP'],
      },
    ]);
    epo.searchPublishedData.mockResolvedValue([
      {
        publicationNumber: 'EP1111111.A1',
        title: 'Widget device',
        applicant: null,
        publicationDate: '2021-01-01',
      },
    ]);

    const result = await service.scanEpoWatchProfiles();
    expect(result.alertsCreated).toBe(1);
    expect(prisma.watchAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          watchProfileId: 'wp1',
          source: WatchRegistrySource.EPO,
          status: WatchAlertStatus.new,
          applicationNumber: 'EP1111111.A1',
        }),
      }),
    );
    expect(alertNotify.notifyAlertCreated).toHaveBeenCalledWith('a1');
  });

  it('scanEpoWatchProfiles skips existing alerts', async () => {
    prisma.watchProfile.findMany.mockResolvedValue([
      {
        id: 'wp1',
        clientId: 'cl1',
        markText: 'WIDGET',
        jurisdictions: ['EP'],
      },
    ]);
    epo.searchPublishedData.mockResolvedValue([
      { publicationNumber: 'EP1111111.A1', title: null, applicant: null, publicationDate: null },
    ]);
    prisma.watchAlert.findFirst.mockResolvedValue({ id: 'existing' });

    const result = await service.scanEpoWatchProfiles();
    expect(result.alertsCreated).toBe(0);
    expect(prisma.watchAlert.create).not.toHaveBeenCalled();
  });

  it('scanEpoForClient validates clientId', async () => {
    await expect(service.scanEpoForClient('')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('scanEpoForClient scopes profiles to client', async () => {
    prisma.watchProfile.findMany.mockResolvedValue([]);
    await service.scanEpoForClient('client-1');
    expect(prisma.watchProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 'client-1',
          status: WatchProfileStatus.active,
        }),
      }),
    );
  });

  it('throws when every profile scan fails', async () => {
    prisma.watchProfile.findMany.mockResolvedValue([
      {
        id: 'wp1',
        clientId: 'cl1',
        markText: 'WIDGET',
        jurisdictions: ['EP'],
      },
    ]);
    epo.searchPublishedData.mockRejectedValue(new Error('rate limit'));

    await expect(service.scanEpoWatchProfiles()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
