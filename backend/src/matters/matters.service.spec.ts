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
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { MattersService } from './matters.service';

describe('MattersService', () => {
  let service: MattersService;
  let prisma: {
    client: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    matter: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    matterJurisdiction: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
      upsert: jest.Mock;
    };
    matterAttributes: { upsert: jest.Mock };
    ipRight: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    matterDocumentVersion: { findFirst: jest.Mock };
    matterTimelineEvent: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let deadlinesService: {
    generateInitialDeadlines: jest.Mock;
    generateDeadlinesFromFiling: jest.Mock;
    countUpcomingByMatterIds: jest.Mock;
    listForMatter: jest.Mock;
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
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
      matterJurisdiction: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        upsert: jest.fn(),
      },
      matterAttributes: { upsert: jest.fn() },
      ipRight: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      matterDocumentVersion: { findFirst: jest.fn() },
      matterTimelineEvent: { create: jest.fn() },
      $transaction: jest.fn(async (ops) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops.map((op) => op));
        }
        return ops(prisma);
      }),
    };
    deadlinesService = {
      generateInitialDeadlines: jest.fn().mockResolvedValue({}),
      generateDeadlinesFromFiling: jest.fn().mockResolvedValue({}),
      countUpcomingByMatterIds: jest.fn().mockResolvedValue(new Map()),
      listForMatter: jest.fn().mockResolvedValue([]),
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

    it('throws when assigned user is missing', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          {
            clientId: 'c1',
            matterType: MatterType.trademark,
            title: 'Test',
            assignedToId: 'missing',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    const user = {
      userId: 'u1',
      roles: ['ip_attorney'],
      permissions: [],
    } as AuthenticatedUser;

    it('returns paginated matters with deadline counts', async () => {
      prisma.matter.count.mockResolvedValue(3);
      prisma.matter.findMany.mockResolvedValue([
        { id: 'm1', title: 'A' },
        { id: 'm2', title: 'B' },
      ]);
      deadlinesService.countUpcomingByMatterIds.mockResolvedValue(
        new Map([['m1', 2]]),
      );

      const result = await service.findAll({ limit: 2, page: 1 }, user);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.pageCount).toBe(2);
      expect(result.nextCursor).toBeNull();
      expect(result.items[0].upcomingDeadlineCount).toBe(2);
      expect(portalAccess.requireScopeClientId).toHaveBeenCalledWith(user);
    });
  });

  describe('findOne', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('asserts portal access when user is provided', async () => {
      const matter = { id: 'm1', title: 'Test' };
      prisma.matter.findUnique.mockResolvedValue(matter);
      const user = { userId: 'u1', roles: [] } as AuthenticatedUser;

      await expect(service.findOne('m1', user)).resolves.toEqual(matter);
      expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    });
  });

  describe('listDeadlines', () => {
    it('delegates to deadlines service after access check', async () => {
      const user = { userId: 'u1', roles: [] } as AuthenticatedUser;
      deadlinesService.listForMatter.mockResolvedValue([{ id: 'd1' }]);

      await expect(service.listDeadlines('m1', user)).resolves.toEqual([
        { id: 'd1' },
      ]);
      expect(portalAccess.assertMatterAccess).toHaveBeenCalledWith('m1', user);
    });
  });

  describe('remove', () => {
    it('deletes an existing matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matter.delete.mockResolvedValue({ id: 'm1' });

      await expect(service.remove('m1')).resolves.toEqual({ deleted: true });
      expect(prisma.matter.delete).toHaveBeenCalledWith({
        where: { id: 'm1' },
      });
    });
  });

  describe('listIpRights', () => {
    it('lists IP rights for a matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1', clientId: 'c1' });
      prisma.ipRight.findMany.mockResolvedValue([{ id: 'ipr1' }]);
      const user = { userId: 'u1', roles: [] } as AuthenticatedUser;

      await expect(service.listIpRights('m1', user)).resolves.toEqual([
        { id: 'ipr1' },
      ]);
    });
  });

  describe('createIpRight', () => {
    it('creates an IP right on the matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        applicantClientId: null,
      });
      prisma.ipRight.create.mockResolvedValue({ id: 'ipr1' });

      const result = await service.createIpRight('m1', {
        rightType: MatterType.trademark,
        title: 'Mark',
        jurisdiction: 'ep',
        status: IpRightStatus.pending,
      } as never);

      expect(result.id).toBe('ipr1');
      expect(prisma.ipRight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            matterId: 'm1',
            clientId: 'c1',
            ownerClientId: 'c1',
            jurisdiction: 'EP',
          }),
        }),
      );
    });

    it('uses matter applicant as IP right owner when set', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        applicantClientId: 'c-apple',
      });
      prisma.client.findUnique.mockResolvedValue({ id: 'c-apple' });
      prisma.ipRight.create.mockResolvedValue({ id: 'ipr2' });

      await service.createIpRight('m1', {
        rightType: MatterType.trademark,
        title: 'Mark',
        jurisdiction: 'bg',
      } as never);

      expect(prisma.ipRight.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: 'c1',
            ownerClientId: 'c-apple',
          }),
        }),
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

    it('forbids abandon without privileged roles', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });

      await expect(
        service.update('m1', { status: MatterStatus.abandoned }, user),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('updates jurisdictions and attributes', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.matter.update.mockResolvedValue({
        id: 'm1',
        title: 'Updated',
      });

      await service.update(
        'm1',
        {
          title: 'Updated',
          jurisdictions: [{ countryCode: 'bg', status: 'pending' as never }],
          attributes: { key: 'value' },
        },
        user,
      );

      expect(prisma.matterJurisdiction.deleteMany).toHaveBeenCalledWith({
        where: { matterId: 'm1' },
      });
      expect(prisma.matterAttributes.upsert).toHaveBeenCalled();
    });
  });

  describe('fileIpRight', () => {
    beforeEach(() => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
      });
    });

    it('throws when IP right is missing on matter', async () => {
      prisma.ipRight.findFirst.mockResolvedValue(null);

      await expect(
        service.fileIpRight(
          'm1',
          'missing',
          {
            applicationNumber: 'EP1',
            filingDate: '2026-01-01',
            documentVersionId: 'dv1',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects when document version is not on matter', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.pending,
        jurisdiction: 'EP',
      });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue(null);

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

  describe('extended branch coverage', () => {
    it('createFromIntake creates matter with jurisdiction and IP right', async () => {
      const tx = {
        matter: {
          create: jest.fn().mockResolvedValue({ id: 'm-new', title: 'From intake' }),
        },
      };
      const lead = {
        id: 'i1',
        matterType: 'trademark',
        fullName: 'Ada Lovelace',
        companyName: null,
        description: 'Mark filing',
        country: 'de',
        assignedUserId: 'u1',
        counterparties: [],
      };

      await service.createFromIntake(tx as never, lead as never, 'c1', 'u1');

      expect(tx.matter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: 'c1',
            sourceIntakeId: 'i1',
            jurisdictions: { create: [{ countryCode: 'DE' }] },
          }),
        }),
      );
    });

    it('findAll scopes to portal client when required', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.matter.count.mockResolvedValue(1);
      prisma.matter.findMany.mockResolvedValue([{ id: 'm1', title: 'Scoped' }]);
      deadlinesService.countUpcomingByMatterIds.mockResolvedValue(new Map());
      await service.findAll({ limit: 10 } as never, {
        userId: 'u1',
        roles: ['portal_client'],
        permissions: [],
      });
      expect(prisma.matter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clientId: 'c1' }),
        }),
      );
    });

    it('update allows managing partner to abandon matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        status: MatterStatus.active,
      });
      prisma.matter.update.mockResolvedValue({
        id: 'm1',
        status: MatterStatus.abandoned,
      });
      await service.update(
        'm1',
        { status: MatterStatus.abandoned },
        { userId: 'u1', roles: [SYSTEM_ROLES.MANAGING_PARTNER], permissions: [] },
      );
      expect(prisma.matter.update).toHaveBeenCalled();
    });

    it('fileIpRight uses IP right jurisdiction when dto jurisdiction omitted', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.pending,
        jurisdiction: 'DE',
      });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue({ id: 'dv1' });
      prisma.ipRight.update.mockResolvedValue({ id: 'ipr1', status: IpRightStatus.filed });

      await service.fileIpRight(
        'm1',
        'ipr1',
        {
          applicationNumber: 'DE123',
          filingDate: '2026-02-01',
          documentVersionId: 'dv1',
        },
        'u1',
      );

      expect(deadlinesService.generateDeadlinesFromFiling).toHaveBeenCalledWith(
        'm1',
        expect.objectContaining({ jurisdiction: 'DE' }),
      );
    });
  });
});
