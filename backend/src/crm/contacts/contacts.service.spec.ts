import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ContactRole,
  RelationshipEventType,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientsService } from '../clients/clients.service';
import type { HistoryService } from '../history/history.service';
import { ContactsService } from './contacts.service';

describe('ContactsService', () => {
  let service: ContactsService;
  let prisma: {
    contact: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    clientOffice: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let clientsService: {
    ensureWritableClient: jest.Mock;
    findOne: jest.Mock;
  };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      contact: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      clientOffice: { findFirst: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    clientsService = {
      ensureWritableClient: jest.fn().mockResolvedValue({ id: 'c1' }),
      findOne: jest.fn(),
    };
    history = { log: jest.fn().mockResolvedValue({}) };

    service = new ContactsService(
      prisma as unknown as PrismaService,
      clientsService as unknown as ClientsService,
      history as unknown as HistoryService,
    );
  });

  describe('create', () => {
    it('demotes other primaries then creates and logs history', async () => {
      prisma.contact.create.mockResolvedValue({
        id: 'ct1',
        firstName: 'Ada',
        lastName: 'Lovelace',
        role: ContactRole.primary,
      });

      await service.create(
        'c1',
        {
          role: ContactRole.primary,
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
        'u1',
      );

      expect(prisma.contact.updateMany).toHaveBeenCalledWith({
        where: {
          clientId: 'c1',
          role: ContactRole.primary,
          isActive: true,
        },
        data: { role: ContactRole.general },
      });
      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'c1',
          userId: 'u1',
          eventType: RelationshipEventType.contact_added,
        }),
      );
    });

    it('rejects officeId that does not belong to the client', async () => {
      prisma.clientOffice.findFirst.mockResolvedValue(null);
      await expect(
        service.create('c1', {
          role: ContactRole.general,
          firstName: 'Ada',
          lastName: 'Lovelace',
          officeId: 'off-x',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('deactivate', () => {
    it('throws when contact is missing', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);
      await expect(service.deactivate('c1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('sets isActive false', async () => {
      prisma.contact.findFirst.mockResolvedValue({ id: 'ct1' });
      prisma.contact.update.mockResolvedValue({ id: 'ct1', isActive: false });

      await service.deactivate('c1', 'ct1');

      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'ct1' },
        data: { isActive: false },
      });
    });
  });

  describe('findAll and update branches', () => {
    it('findAll scopes by client and optional role', async () => {
      prisma.contact.findMany.mockResolvedValue([]);

      await service.findAll('c1', { role: ContactRole.billing } as never);

      expect(clientsService.findOne).toHaveBeenCalledWith('c1');
      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'c1', isActive: true, role: ContactRole.billing },
        }),
      );
    });

    it('update promotes contact to primary and logs history', async () => {
      prisma.contact.findFirst.mockResolvedValue({
        id: 'ct2',
        role: ContactRole.general,
        firstName: 'Bob',
        lastName: 'Smith',
      });
      prisma.contact.update.mockResolvedValue({
        id: 'ct2',
        role: ContactRole.primary,
        firstName: 'Bob',
        lastName: 'Smith',
      });

      await service.update(
        'c1',
        'ct2',
        { role: ContactRole.primary },
        'u1',
      );

      expect(prisma.contact.updateMany).toHaveBeenCalled();
      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: RelationshipEventType.contact_added,
          description: expect.stringContaining('Primary contact set'),
        }),
      );
    });

    it('update validates office when officeId provided', async () => {
      prisma.contact.findFirst.mockResolvedValue({
        id: 'ct3',
        role: ContactRole.general,
      });
      prisma.clientOffice.findFirst.mockResolvedValue({ id: 'off1' });
      prisma.contact.update.mockResolvedValue({ id: 'ct3' });

      await service.update('c1', 'ct3', { officeId: 'off1' } as never, 'u1');

      expect(prisma.clientOffice.findFirst).toHaveBeenCalledWith({
        where: { id: 'off1', clientId: 'c1' },
      });
    });

    it('update throws when contact is missing', async () => {
      prisma.contact.findFirst.mockResolvedValue(null);
      await expect(
        service.update('c1', 'missing', { firstName: 'X' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('create without primary role skips demotion', async () => {
      prisma.contact.create.mockResolvedValue({
        id: 'ct4',
        firstName: 'Eve',
        lastName: 'Doe',
        role: ContactRole.general,
      });

      await service.create(
        'c1',
        {
          role: ContactRole.general,
          firstName: 'Eve',
          lastName: 'Doe',
        },
        'u1',
      );

      expect(prisma.contact.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllGlobal', () => {
    it('returns paginated contacts with client display names', async () => {
      prisma.contact.findMany.mockResolvedValue([
        {
          id: 'ct1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          role: ContactRole.primary,
          email: 'ada@example.com',
          client: {
            id: 'c1',
            type: 'company',
            internalCode: 'CL-1',
            companyName: 'Acme',
            firstName: null,
            lastName: null,
          },
        },
        {
          id: 'ct2',
          firstName: 'Eve',
          lastName: 'Doe',
          role: ContactRole.general,
          client: {
            id: 'c2',
            type: 'individual',
            internalCode: 'CL-2',
            companyName: null,
            firstName: 'Eve',
            lastName: 'Owner',
          },
        },
      ]);

      const result = await service.findAllGlobal({ limit: 1 });

      expect(result.items).toHaveLength(1);
      expect(result.nextCursor).toBe('ct1');
      expect(result.items[0].client.displayName).toBe('Acme');
    });
  });
});
