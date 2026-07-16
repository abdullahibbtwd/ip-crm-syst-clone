import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientsService } from '../clients/clients.service';
import type { HistoryService } from '../history/history.service';
import { RelatedCompaniesService } from './related-companies.service';

describe('RelatedCompaniesService', () => {
  let service: RelatedCompaniesService;
  let prisma: {
    relatedCompany: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let clientsService: {
    ensureWritableClient: jest.Mock;
    findOne: jest.Mock;
  };
  let history: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      relatedCompany: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    clientsService = {
      ensureWritableClient: jest.fn().mockResolvedValue({ id: 'c1' }),
      findOne: jest.fn(),
    };
    history = { log: jest.fn().mockResolvedValue({}) };
    service = new RelatedCompaniesService(
      prisma as unknown as PrismaService,
      clientsService as unknown as ClientsService,
      history as unknown as HistoryService,
    );
  });

  it('rejects when both relatedClientId and externalName are set', async () => {
    await expect(
      service.create('c1', {
        relatedClientId: 'c2',
        externalName: 'Other Co',
        relationshipType: 'subsidiary',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects self-relation', async () => {
    await expect(
      service.create('c1', {
        relatedClientId: 'c1',
        relationshipType: 'subsidiary',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates external relation and logs history', async () => {
    prisma.relatedCompany.create.mockResolvedValue({ id: 'rel1' });

    await service.create(
      'c1',
      {
        externalName: ' Rival Ltd ',
        relationshipType: 'subsidiary',
      },
      'u1',
    );

    expect(prisma.relatedCompany.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalName: 'Rival Ltd',
        }),
      }),
    );
    expect(history.log).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: RelationshipEventType.related_company_linked,
      }),
    );
  });

  it('remove throws when relation is missing', async () => {
    prisma.relatedCompany.findFirst.mockResolvedValue(null);
    await expect(service.remove('c1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
