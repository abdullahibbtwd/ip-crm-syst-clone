import { NotFoundException } from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientsService } from '../clients/clients.service';
import type { HistoryService } from '../history/history.service';
import { ClientNotesService } from './client-notes.service';

describe('ClientNotesService', () => {
  let service: ClientNotesService;
  let prisma: {
    clientNote: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let clientsService: {
    findOne: jest.Mock;
    ensureWritableClient: jest.Mock;
  };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      clientNote: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    clientsService = {
      findOne: jest.fn().mockResolvedValue({ id: 'c1' }),
      ensureWritableClient: jest.fn().mockResolvedValue({ id: 'c1' }),
    };
    history = { log: jest.fn().mockResolvedValue({}) };
    service = new ClientNotesService(
      prisma as unknown as PrismaService,
      clientsService as unknown as ClientsService,
      history as unknown as HistoryService,
    );
  });

  it('lists notes for a client', async () => {
    prisma.clientNote.findMany.mockResolvedValue([{ id: 'n1', body: 'Hello' }]);
    await expect(service.findAll('c1')).resolves.toEqual([
      { id: 'n1', body: 'Hello' },
    ]);
    expect(clientsService.findOne).toHaveBeenCalledWith('c1');
  });

  it('creates a note and logs history', async () => {
    prisma.clientNote.create.mockResolvedValue({
      id: 'n1',
      body: 'Follow up',
    });
    const result = await service.create('c1', { body: '  Follow up  ' }, 'u1');
    expect(result.id).toBe('n1');
    expect(prisma.clientNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          clientId: 'c1',
          body: 'Follow up',
          createdById: 'u1',
        }),
      }),
    );
    expect(history.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: RelationshipEventType.note_added,
        clientId: 'c1',
      }),
    );
  });

  it('rejects updates for missing notes', async () => {
    prisma.clientNote.findFirst.mockResolvedValue(null);
    await expect(
      service.update('c1', 'n-missing', { body: 'x' }, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
