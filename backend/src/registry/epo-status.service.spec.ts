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

  describe('additional branch coverage', () => {
    it('accepts EPO jurisdiction alias', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({ jurisdiction: 'EPO' }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
        events: [],
      });
      const result = await service.checkIpRight('ir1');
      expect(result.success).toBe(true);
    });

    it('uses registration number when application number is absent', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          applicationNumber: null,
          registrationNumber: 'EP8888888',
        }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP8888888',
        events: [],
      });
      const result = await service.checkIpRight('ir1');
      expect(result.applicationNumber).toBe('EP8888888');
    });

    it('reports no actionable events when only other kinds are returned', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(ipRightRow());
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
        events: [
          {
            eventId: 'X|2020-01-01|Misc',
            code: 'X',
            date: '2020-01-01',
            description: 'Misc',
            kind: 'other',
          },
        ],
      });
      const result = await service.checkIpRight('ir1', 'actor-1');
      expect(result.message).toContain('No actionable EPO legal events');
      expect(correspondence.create).not.toHaveBeenCalled();
    });

    it('creates refusal correspondence with office_action category path', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(ipRightRow());
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP3000000.A1',
        events: [
          {
            eventId: '18W|2022-03-01|Withdrawn',
            code: '18W',
            date: '2022-03-01',
            description: 'Deemed withdrawn',
            kind: 'refusal',
          },
        ],
      });
      await service.checkIpRight('ir1', 'actor-1');
      expect(correspondence.create).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          category: 'office_action',
          subject: expect.stringContaining('Refusal'),
        }),
        'actor-1',
      );
    });

    it('uses explicit actorUserId and skips fallback lookup', async () => {
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
      await service.checkIpRight('ir1', 'explicit-actor');
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
      expect(correspondence.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'explicit-actor',
      );
    });

    it('uses filedById when assignee is missing', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          matter: {
            id: 'm1',
            assignedToId: null,
            filedById: 'u-filed',
            title: 'M',
            assignedTo: null,
          },
        }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
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
      await service.checkIpRight('ir1');
      expect(correspondence.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        'u-filed',
      );
    });

    it('does not notify when assignee row is missing', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          matter: {
            id: 'm1',
            assignedToId: 'u1',
            filedById: null,
            title: 'M',
            assignedTo: null,
          },
        }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
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
      await service.checkIpRight('ir1', 'actor-1');
      expect(notifications.dispatch).not.toHaveBeenCalled();
    });

    it('backfills application number from registration lookup', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          applicationNumber: null,
          registrationNumber: 'EP7777777',
        }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP7777777',
        applicationRef: {
          baseNumber: '7777777',
          checkDigit: '7',
          fullAppNumber: '77777777',
          epodoc: 'EP77777777',
        },
        events: [],
      });
      await service.checkIpRight('ir1', 'actor-1');
      expect(prisma.ipRight.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationNumber: 'EP7777777',
          }),
        }),
      );
    });

    it('continues when document fetch enqueue fails', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(ipRightRow());
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
      epoDocumentQueue.add.mockRejectedValue(new Error('queue down'));
      const result = await service.checkIpRight('ir1', 'actor-1');
      expect(result.correspondenceCreated).toBe(1);
    });

    it('resolveFallbackUserId throws when no managing partner exists', async () => {
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
      prisma.user.findFirst.mockResolvedValue(null);
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
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
      await expect(service.checkIpRight('ir1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('checkIpRight returns early for non-EP jurisdiction', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({ jurisdiction: 'US' }),
      );
      const result = await service.checkIpRight('ir1');
      expect(result.success).toBe(false);
      expect(result.message).toContain('jurisdiction EP');
      expect(epo.getLegalStatus).not.toHaveBeenCalled();
    });

    it('checkIpRight returns early when no lookup number', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          applicationNumber: null,
          registrationNumber: null,
        }),
      );
      const result = await service.checkIpRight('ir1');
      expect(result.message).toContain('no application number');
    });

    it('checkIpRight returns early for non-monitored status', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({ status: IpRightStatus.abandoned }),
      );
      const result = await service.checkIpRight('ir1');
      expect(result.message).toContain('only filed/registered');
    });

    it('checkIpRight reports no actionable events when only other kinds exist', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(ipRightRow());
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
        events: [
          {
            eventId: 'X|2021-01-01|Misc',
            code: 'X',
            date: '2021-01-01',
            description: 'Misc',
            kind: 'other',
          },
        ],
      });
      const result = await service.checkIpRight('ir1', 'actor-1');
      expect(result.message).toContain('No actionable EPO legal events');
    });

    it('checkIpRight reports no new events when all actionable already seen', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({
          attributes: {
            epoSeenEventIds: ['17P|2021-03-15|Request'],
          },
        }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
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
      expect(result.message).toContain('No new EPO events');
    });

    it('scanAllActiveEpRights counts errors from failed checks', async () => {
      prisma.ipRight.findMany.mockResolvedValue([{ id: 'ir1' }, { id: 'ir2' }]);
      jest
        .spyOn(service, 'checkIpRight')
        .mockResolvedValueOnce({
          success: true,
          ipRightId: 'ir1',
          applicationNumber: 'EP1',
          eventsFound: 0,
          newEvents: 0,
          correspondenceCreated: 0,
          message: 'ok',
        })
        .mockRejectedValueOnce(new Error('boom'));

      const result = await service.scanAllActiveEpRights();
      expect(result.rightsScanned).toBe(2);
      expect(result.errors).toBe(1);
    });

    it('checkIpRight accepts EPO jurisdiction alias', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(
        ipRightRow({ jurisdiction: 'EPO' }),
      );
      epo.getLegalStatus.mockResolvedValue({
        publicationNumber: 'EP1',
        events: [],
      });
      const result = await service.checkIpRight('ir1', 'actor-1');
      expect(result.success).toBe(true);
    });

    it('checkIpRight throws NotFoundException when ip right missing', async () => {
      prisma.ipRight.findUnique.mockResolvedValue(null);
      await expect(service.checkIpRight('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
