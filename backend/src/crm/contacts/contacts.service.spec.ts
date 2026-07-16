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
});
