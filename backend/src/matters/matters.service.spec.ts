import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  IpRightStatus,
  MatterStatus,
  MatterType,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import type { DeadlinesService } from '../deadlines/deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import { MattersService } from './matters.service';

describe('MattersService', () => {
  let service: MattersService;
  let prisma: {
    client: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    matter: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    matterJurisdiction: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      upsert: jest.Mock;
    };
    matterAttributes: { upsert: jest.Mock };
    ipRight: { findFirst: jest.Mock; update: jest.Mock };
    matterDocumentVersion: { findFirst: jest.Mock };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let deadlinesService: {
    generateInitialDeadlines: jest.Mock;
    generateDeadlinesFromFiling: jest.Mock;
  };
  let portalAccess: {
    requireScopeClientId: jest.Mock;
    assertMatterAccess: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      client: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      matter: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      matterJurisdiction: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      matterAttributes: { upsert: jest.fn() },
      ipRight: { findFirst: jest.fn(), update: jest.fn() },
      matterDocumentVersion: { findFirst: jest.fn() },
      matterTimelineEvent: { create: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    deadlinesService = {
      generateInitialDeadlines: jest.fn().mockResolvedValue({}),
      generateDeadlinesFromFiling: jest.fn().mockResolvedValue({}),
    };
    portalAccess = {
      requireScopeClientId: jest.fn().mockReturnValue(null),
      assertMatterAccess: jest.fn(),
    };

    service = new MattersService(
      prisma as unknown as PrismaService,
      deadlinesService as unknown as DeadlinesService,
      portalAccess as unknown as PortalAccessService,
    );
  });

  describe('create', () => {
    it('throws when client is missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.create(
          {
            clientId: 'c1',
            matterType: MatterType.trademark,
            title: 'Test',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates a matter and generates initial deadlines', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.matter.create.mockResolvedValue({ id: 'm1', title: 'Test' });

      const result = await service.create(
        {
          clientId: 'c1',
          matterType: MatterType.trademark,
          title: 'Test',
        },
        'u1',
      );

      expect(result.id).toBe('m1');
      expect(deadlinesService.generateInitialDeadlines).toHaveBeenCalledWith(
        'm1',
      );
    });
  });

  describe('update', () => {
    const user = {
      userId: 'u1',
      roles: ['paralegal'],
    } as AuthenticatedUser;

    it('forbids close/abandon without privileged roles', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });

      await expect(
        service.update('m1', { status: MatterStatus.closed }, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows close for ip_attorney', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matter.update.mockResolvedValue({
        id: 'm1',
        status: MatterStatus.closed,
      });

      await service.update(
        'm1',
        { status: MatterStatus.closed },
        { ...user, roles: ['ip_attorney'] },
      );

      expect(prisma.matter.update).toHaveBeenCalled();
    });
  });

  describe('fileIpRight', () => {
    beforeEach(() => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
      });
    });

    it('rejects IP rights that are not pending', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.filed,
        jurisdiction: 'EP',
      });

      await expect(
        service.fileIpRight(
          'm1',
          'ipr1',
          {
            applicationNumber: 'EP1',
            filingDate: '2026-01-01',
            documentVersionId: 'dv1',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('files a pending IP right and generates filing deadlines', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.pending,
        jurisdiction: 'EP',
      });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue({ id: 'dv1' });
      prisma.ipRight.update.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.filed,
      });

      await service.fileIpRight(
        'm1',
        'ipr1',
        {
          applicationNumber: 'EP123',
          filingDate: '2026-02-01',
          documentVersionId: 'dv1',
          jurisdiction: 'EP',
        },
        'u1',
      );

      expect(prisma.ipRight.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: IpRightStatus.filed,
            applicationNumber: 'EP123',
          }),
        }),
      );
      expect(
        deadlinesService.generateDeadlinesFromFiling,
      ).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({
          jurisdiction: 'EP',
          userId: 'u1',
          ipRightId: 'ipr1',
        }),
      );
    });
  });
});
