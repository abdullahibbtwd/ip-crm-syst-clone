import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import {
  CLIENT_OFFICE_ADDRESS_TYPE,
} from './client-office-address.util';
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
      findMany: jest.Mock;
      count: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
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
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
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

  it('upsertTypedAddress creates registered legal address as primary', async () => {
    prisma.clientOffice.findFirst.mockResolvedValue(null);
    prisma.clientOffice.create.mockResolvedValue({
      id: 'o1',
      addressType: CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
      isPrimary: true,
    });

    await service.upsertTypedAddress(
      'c1',
      CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
      { city: 'Sofia' },
      'u1',
    );

    expect(prisma.clientOffice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          addressType: CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
          isPrimary: true,
          city: 'Sofia',
        }),
      }),
    );
    expect(history.log).toHaveBeenCalled();
  });

  it('upsertTypedAddress rejects branch type', async () => {
    await expect(
      service.upsertTypedAddress(
        'c1',
        CLIENT_OFFICE_ADDRESS_TYPE.branch,
        {},
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove allows deleting typed addresses even when primary', async () => {
    prisma.clientOffice.findFirst.mockResolvedValue({
      id: 'o1',
      isPrimary: true,
      addressType: CLIENT_OFFICE_ADDRESS_TYPE.registered_legal,
    });
    prisma.clientOffice.delete.mockResolvedValue({ id: 'o1' });

    await service.remove('c1', 'o1');

    expect(prisma.clientOffice.delete).toHaveBeenCalledWith({
      where: { id: 'o1' },
    });
  });
});
