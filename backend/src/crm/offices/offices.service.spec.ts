import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientsService } from '../clients/clients.service';
import type { HistoryService } from '../history/history.service';
import { OfficesService } from './offices.service';

describe('OfficesService', () => {
  let service: OfficesService;
  let prisma: {
    clientOffice: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let clientsService: { ensureWritableClient: jest.Mock; findOne: jest.Mock };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      clientOffice: {
        updateMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    clientsService = {
      ensureWritableClient: jest.fn().mockResolvedValue({ id: 'c1' }),
      findOne: jest.fn(),
    };
    history = { log: jest.fn().mockResolvedValue({}) };
    service = new OfficesService(
      prisma as unknown as PrismaService,
      clientsService as unknown as ClientsService,
      history as unknown as HistoryService,
    );
  });

  it('create demotes other primaries and logs history', async () => {
    prisma.clientOffice.create.mockResolvedValue({
      id: 'o1',
      label: 'HQ',
      isPrimary: true,
    });

    await service.create(
      'c1',
      { label: 'HQ', isPrimary: true } as never,
      'u1',
    );

    expect(prisma.clientOffice.updateMany).toHaveBeenCalled();
    expect(history.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: RelationshipEventType.office_added,
      }),
    );
  });

  it('remove blocks deleting the only primary office', async () => {
    prisma.clientOffice.findFirst.mockResolvedValue({
      id: 'o1',
      isPrimary: true,
    });
    prisma.clientOffice.count.mockResolvedValue(0);

    await expect(service.remove('c1', 'o1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('remove throws when office is missing', async () => {
    prisma.clientOffice.findFirst.mockResolvedValue(null);
    await expect(service.remove('c1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
