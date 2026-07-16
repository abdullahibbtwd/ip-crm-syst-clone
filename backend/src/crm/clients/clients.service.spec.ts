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
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
  };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      client: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
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

    it('creates a company client and logs history', async () => {
      prisma.client.findFirst.mockResolvedValue(null);
      prisma.client.create.mockResolvedValue({
        id: 'c1',
        internalCode: `CL-${new Date().getFullYear()}-001`,
        type: ClientType.company,
        companyName: 'Acme',
        firstName: null,
        lastName: null,
      });

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

  describe('findOne', () => {
    it('throws when missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
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
