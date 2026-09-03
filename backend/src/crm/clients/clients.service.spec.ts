import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientStatus,
  ClientType,
  RelationshipEventType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { HistoryService } from '../history/history.service';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: {
    client: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    clientOffice: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    matter: { findMany: jest.Mock };
    auditLog: { groupBy: jest.Mock };
    deadline: { findMany: jest.Mock };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      client: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      clientOffice: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      matter: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { groupBy: jest.fn().mockResolvedValue([]) },
      deadline: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (fn) => fn(prisma)),
      $executeRaw: jest.fn(),
    };
    history = { log: jest.fn().mockResolvedValue({}) };
    service = new ClientsService(
      prisma as unknown as PrismaService,
      history as unknown as HistoryService,
    );
  });

  describe('create', () => {
    it('rejects company clients without companyName', async () => {
      await expect(
        service.create({
          type: ClientType.company,
          country: 'BG',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects individual clients without names', async () => {
      await expect(
        service.create({
          type: ClientType.individual,
          country: 'BG',
        } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a company client and logs history', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      const created = {
        id: 'c1',
        internalCode: `CL-${new Date().getFullYear()}-001`,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
      };
      prisma.client.create.mockResolvedValue(created);
      prisma.client.findUniqueOrThrow.mockResolvedValue(created);
      prisma.clientOffice.findFirst.mockResolvedValue(null);

      const result = await service.create(
        {
          type: ClientType.company,
          companyName: 'Acme',
          country: 'BG',
        } as never,
        'u1',
      );

      expect(result.id).toBe('c1');
      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: RelationshipEventType.created,
          userId: 'u1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated clients with display names and totals', async () => {
      prisma.client.count = jest.fn().mockResolvedValue(3);
      prisma.client.findMany.mockResolvedValue([
        {
          id: 'c1',
          type: ClientType.company,
          companyName: 'Acme',
          firstName: null,
          lastName: null,
          internalCode: 'CL-2026-001',
        },
        {
          id: 'c2',
          type: ClientType.company,
          companyName: 'Beta',
          firstName: null,
          lastName: null,
          internalCode: 'CL-2026-002',
        },
      ]);
      prisma.$transaction = jest.fn(async (ops) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops.map((op) => op));
        }
        return ops(prisma);
      });

      const result = await service.findAll({ limit: 2, page: 1 } as never);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].displayName).toBe('Acme');
      expect(result.items[0].tabCounts).toEqual(
        expect.objectContaining({ offices: 0, notes: 0, deadlines: 0 }),
      );
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
      expect(result.pageCount).toBe(2);
      expect(result.nextCursor).toBeNull();
    });

    it('applies search, filters, and sort order', async () => {
      prisma.client.count = jest.fn().mockResolvedValue(0);
      prisma.client.findMany.mockResolvedValue([]);
      prisma.$transaction = jest.fn(async (ops) => {
        if (Array.isArray(ops)) {
          return Promise.all(ops.map((op) => op));
        }
        return ops(prisma);
      });

      await service.findAll({
        search: ' acme ',
        status: ClientStatus.active,
        type: ClientType.company,
        assignedUserId: 'u1',
        holdingGroupId: 'hg1',
        gdprConsent: true,
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        limit: 25,
      } as never);

      expect(prisma.client.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ClientStatus.active,
            type: ClientType.company,
            assignedUserId: 'u1',
            holdingGroupId: 'hg1',
            gdprConsent: true,
            OR: expect.any(Array),
          }),
          skip: 25,
          take: 25,
          orderBy: [
            { companyName: 'asc' },
            { lastName: 'asc' },
            { firstName: 'asc' },
            { id: 'asc' },
          ],
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns client with display name', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        internalCode: 'CL-2026-001',
      });

      const result = await service.findOne('c1');
      expect(result.displayName).toBe('Acme');
    });

    it('throws when missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getSummary', () => {
    it('throws when missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.getSummary('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns summary fields', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        internalCode: 'CL-1',
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        status: ClientStatus.active,
        country: 'BG',
        contacts: [{ id: 'ct1' }],
        offices: [{ id: 'o1' }],
      });

      const result = await service.getSummary('c1');
      expect(result.displayName).toBe('Acme');
      expect(result.primaryContact).toEqual({ id: 'ct1' });
    });
  });

  describe('update', () => {
    it('rejects archived clients', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.archived,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        holdingGroupId: null,
        gdprConsent: false,
        gdprConsentDate: null,
      });

      await expect(
        service.update('c1', { notes: 'x' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates client and logs status change', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.active,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        holdingGroupId: null,
        gdprConsent: false,
        gdprConsentDate: null,
      });
      prisma.client.update.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.inactive,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        internalCode: 'CL-1',
      });

      await service.update(
        'c1',
        { status: ClientStatus.inactive } as never,
        'u1',
      );

      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: RelationshipEventType.status_changed,
        }),
      );
    });

    it('logs holding group changes and sets gdpr consent date', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.active,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        holdingGroupId: null,
        gdprConsent: false,
        gdprConsentDate: null,
        internalCode: 'CL-1',
        contacts: [],
        offices: [],
        relatedCompanies: [],
        assignedUser: null,
        holdingGroup: null,
      });
      prisma.client.update.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.active,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        holdingGroupId: 'hg1',
        gdprConsent: true,
        gdprConsentDate: new Date(),
        internalCode: 'CL-1',
        contacts: [],
        offices: [],
        relatedCompanies: [],
        assignedUser: null,
        holdingGroup: { id: 'hg1', name: 'Group' },
      });

      await service.update(
        'c1',
        { holdingGroupId: 'hg1', gdprConsent: true } as never,
        'u1',
      );

      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: RelationshipEventType.holding_changed,
        }),
      );
    });
  });

  describe('archive', () => {
    it('returns existing archived client without update', async () => {
      const archived = {
        id: 'c1',
        status: ClientStatus.archived,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        internalCode: 'CL-1',
      };
      prisma.client.findUnique.mockResolvedValue(archived);

      await expect(service.archive('c1')).resolves.toMatchObject({
        id: 'c1',
        displayName: 'Acme',
      });
      expect(prisma.client.update).not.toHaveBeenCalled();
    });

    it('archives active client and logs history', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.active,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        internalCode: 'CL-1',
      });
      prisma.client.update.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.archived,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
        internalCode: 'CL-1',
      });

      await service.archive('c1', 'u1');

      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Client archived',
        }),
      );
    });
  });

  describe('ensureWritableClient', () => {
    it('throws NotFound when missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(
        service.ensureWritableClient('missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws BadRequest when archived', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.archived,
      });
      await expect(service.ensureWritableClient('c1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns the client when active', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'c1',
        status: ClientStatus.active,
      });
      await expect(service.ensureWritableClient('c1')).resolves.toEqual({
        id: 'c1',
        status: ClientStatus.active,
      });
    });
  });
});
