import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { IpRightStatus } from '../../generated/prisma/client';
import type { CorrespondenceService } from '../correspondence/correspondence.service';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EpoStatusService } from './epo-status.service';
import type { EpoProvider } from './providers/epo.provider';
import { EPO_DOCUMENT_FETCH_JOB } from './registry.constants';

function ipRightRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ir1',
    matterId: 'm1',
    jurisdiction: 'EP',
    status: IpRightStatus.filed,
    applicationNumber: 'EP237170531',
    registrationNumber: null,
    attributes: {},
    matter: {
      id: 'm1',
      assignedToId: 'u1',
      filedById: 'u2',
      title: 'Widget matter',
      assignedTo: {
        id: 'u1',
        email: 'lawyer@example.com',
        fullName: 'Lawyer',
      },
    },
    ...overrides,
  };
}

describe('EpoStatusService', () => {
  let service: EpoStatusService;
  let prisma: {
    ipRight: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
    user: { findFirst: jest.Mock };
  };
  let epo: {
    isConfigured: jest.Mock;
    getLegalStatus: jest.Mock;
  };
  let correspondence: { create: jest.Mock };
  let notifications: { dispatch: jest.Mock };
  let epoDocumentQueue: { add: jest.Mock };

  beforeEach(() => {
    prisma = {
      ipRight: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findFirst: jest.fn() },
    };
    epo = {
      isConfigured: jest.fn().mockReturnValue(true),
      getLegalStatus: jest.fn(),
    };
    correspondence = {
      create: jest.fn().mockResolvedValue({ id: 'c1' }),
    };
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    epoDocumentQueue = { add: jest.fn().mockResolvedValue(undefined) };

    service = new EpoStatusService(
      prisma as unknown as PrismaService,
      epo as unknown as EpoProvider,
      correspondence as unknown as CorrespondenceService,
      notifications as unknown as NotificationDispatchService,
      epoDocumentQueue as never,
    );
  });

  it('scanAllActiveEpRights skips when EPO is not configured', async () => {
    epo.isConfigured.mockReturnValue(false);
    await expect(service.scanAllActiveEpRights()).resolves.toEqual({
      rightsScanned: 0,
      correspondenceCreated: 0,
      errors: 0,
    });
    expect(prisma.ipRight.findMany).not.toHaveBeenCalled();
  });

  it('scanAllActiveEpRights aggregates per-right results', async () => {
    prisma.ipRight.findMany.mockResolvedValue([{ id: 'ir1' }, { id: 'ir2' }]);
    jest
      .spyOn(service, 'checkIpRight')
      .mockResolvedValueOnce({
        success: true,
        ipRightId: 'ir1',
        applicationNumber: 'EP1',
        eventsFound: 1,
        newEvents: 1,
        correspondenceCreated: 1,
        message: 'ok',
      })
      .mockRejectedValueOnce(new Error('boom'));

    const result = await service.scanAllActiveEpRights();
    expect(result).toEqual({
      rightsScanned: 2,
      correspondenceCreated: 1,
      errors: 1,
    });
  });

  it('checkIpRight throws when EPO is not configured', async () => {
    epo.isConfigured.mockReturnValue(false);
    await expect(service.checkIpRight('ir1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('checkIpRight throws when IP right is missing', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(null);
    await expect(service.checkIpRight('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('checkIpRight rejects non-EP jurisdictions', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(
      ipRightRow({ jurisdiction: 'US' }),
    );
    const result = await service.checkIpRight('ir1');
    expect(result.success).toBe(false);
    expect(result.message).toContain('jurisdiction EP');
  });

  it('checkIpRight rejects missing application number', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(
      ipRightRow({ applicationNumber: null, registrationNumber: null }),
    );
    const result = await service.checkIpRight('ir1');
    expect(result.message).toContain('no application number');
  });

  it('checkIpRight rejects inactive statuses', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(
      ipRightRow({ status: IpRightStatus.abandoned }),
    );
    const result = await service.checkIpRight('ir1');
    expect(result.message).toContain('only filed/registered');
  });

  it('checkIpRight creates correspondence for new actionable events', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(ipRightRow());
    epo.getLegalStatus.mockResolvedValue({
      publicationNumber: 'EP3000000.A1',
      publicationRef: { epodoc: 'EP3000000.A1' },
      applicationRef: {
        baseNumber: '23717053',
        checkDigit: '1',
        fullAppNumber: '237170531',
        epodoc: 'EP237170531',
      },
      events: [
        {
          eventId: '17P|2021-03-15|Request',
          code: '17P',
          date: '2021-03-15',
          description: 'Request for examination',
          kind: 'office_action',
        },
      ],
    });

    const result = await service.checkIpRight('ir1', 'actor-1');

    expect(result.correspondenceCreated).toBe(1);
    expect(correspondence.create).toHaveBeenCalledWith(
      'm1',
      expect.objectContaining({
        sender: 'EPO',
        metadata: expect.objectContaining({
          source: 'epo_ops',
          epoDocumentFetchStatus: 'pending',
        }),
      }),
      'actor-1',
    );
    expect(epoDocumentQueue.add).toHaveBeenCalledWith(
      EPO_DOCUMENT_FETCH_JOB,
      expect.objectContaining({ correspondenceId: 'c1' }),
      expect.any(Object),
    );
    expect(notifications.dispatch).toHaveBeenCalled();
    expect(prisma.ipRight.update).toHaveBeenCalled();
  });

  it('checkIpRight skips already seen events', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(
      ipRightRow({
        attributes: {
          epoSeenEventIds: ['17P|2021-03-15|Request'],
        },
      }),
    );
    epo.getLegalStatus.mockResolvedValue({
      publicationNumber: 'EP3000000.A1',
      events: [
        {
          eventId: '17P|2021-03-15|Request',
          code: '17P',
          date: '2021-03-15',
          description: 'Request',
          kind: 'office_action',
        },
      ],
    });

    const result = await service.checkIpRight('ir1', 'actor-1');
    expect(result.correspondenceCreated).toBe(0);
    expect(correspondence.create).not.toHaveBeenCalled();
    expect(result.message).toContain('No new EPO events');
  });

  it('checkIpRight uses managing partner fallback actor', async () => {
    prisma.ipRight.findUnique.mockResolvedValue(
      ipRightRow({
        matter: {
          id: 'm1',
          assignedToId: null,
          filedById: null,
          title: 'M',
          assignedTo: null,
        },
      }),
    );
    prisma.user.findFirst.mockResolvedValue({ id: 'mp1' });
    epo.getLegalStatus.mockResolvedValue({
      publicationNumber: 'EP1',
      events: [
        {
          eventId: 'B1|2022-01-01|Grant',
          code: 'B1',
          date: '2022-01-01',
          description: 'Grant',
          kind: 'grant',
        },
      ],
    });

    await service.checkIpRight('ir1');
    expect(correspondence.create).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      'mp1',
    );
  });
});
