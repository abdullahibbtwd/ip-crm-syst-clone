import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MatterType } from '../../generated/prisma/client';
import type { CustomsSeizureDeadlinesService } from '../deadlines/customs-seizure-deadlines.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomsService } from './customs.service';

const borderMatter = {
  id: 'm1',
  clientId: 'c1',
  matterType: MatterType.border_measures,
};

const user = { id: 'u1', fullName: 'Ada', email: 'a@x.com' };

function baseSeizure(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sz1',
    matterId: 'm1',
    clientId: 'c1',
    seizureDate: new Date('2026-01-01'),
    customsOffice: 'Sofia',
    consignmentReference: null,
    goodsDescription: 'Goods',
    quantity: null,
    portOfEntry: null,
    status: 'open',
    linkedMatterId: null,
    createdById: 'u1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: user,
    linkedMatter: null,
    ...overrides,
  };
}

describe('CustomsService', () => {
  let service: CustomsService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    customsSeizure: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    customsApplication: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    custodyLog: { create: jest.Mock };
    matterDocumentVersion: { findUnique: jest.Mock };
  };
  let seizureDeadlines: { generateFromSeizure: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      customsSeizure: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      customsApplication: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      custodyLog: { create: jest.fn() },
      matterDocumentVersion: { findUnique: jest.fn() },
    };
    seizureDeadlines = {
      generateFromSeizure: jest.fn().mockResolvedValue([]),
    };
    service = new CustomsService(
      prisma as unknown as PrismaService,
      seizureDeadlines as unknown as CustomsSeizureDeadlinesService,
    );
  });

  describe('listSeizures', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listSeizures('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects non border_measures matters', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        ...borderMatter,
        matterType: MatterType.trademark,
      });
      await expect(service.listSeizures('m1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('returns serialized seizures', async () => {
      prisma.matter.findUnique.mockResolvedValue(borderMatter);
      prisma.customsSeizure.findMany.mockResolvedValue([
        {
          ...baseSeizure(),
          _count: { custodyLogs: 2, applications: 1 },
        },
      ]);

      const result = await service.listSeizures('m1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'sz1',
        custodyCount: 2,
        applicationCount: 1,
      });
    });
  });

  describe('getSeizure', () => {
    it('throws when seizure is missing', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(null);
      await expect(service.getSeizure('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns seizure with custody logs and applications', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue({
        ...baseSeizure(),
        custodyLogs: [
          {
            id: 'cl1',
            action: 'received',
            occurredAt: new Date('2026-01-02'),
            notes: null,
            actorUser: user,
            documentVersion: null,
            createdAt: new Date('2026-01-02'),
          },
        ],
        applications: [
          {
            id: 'app1',
            matterId: 'm1',
            seizureId: 'sz1',
            authority: 'Customs',
            applicationNumber: 'A-1',
            submittedDate: null,
            validFrom: null,
            validUntil: null,
            status: 'pending',
            renewalOfId: null,
            createdById: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: user,
          },
        ],
      });

      const result = await service.getSeizure('sz1');

      expect(result.custodyLogs).toHaveLength(1);
      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].authority).toBe('Customs');
    });
  });

  describe('createSeizure', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.createSeizure(
          'missing',
          {
            seizureDate: '2026-01-01',
            customsOffice: 'Sofia',
            goodsDescription: 'Goods',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non border_measures matters', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
        matterType: MatterType.trademark,
      });
      await expect(
        service.createSeizure(
          'm1',
          {
            seizureDate: '2026-01-01',
            customsOffice: 'Sofia',
            goodsDescription: 'Goods',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a seizure and generates deadlines', async () => {
      prisma.matter.findUnique.mockResolvedValue(borderMatter);
      prisma.customsSeizure.create.mockResolvedValue(baseSeizure());

      const result = await service.createSeizure(
        'm1',
        {
          seizureDate: '2026-01-01',
          customsOffice: ' Sofia ',
          goodsDescription: ' Goods ',
        },
        'u1',
      );

      expect(result.id).toBe('sz1');
      expect(prisma.customsSeizure.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            customsOffice: 'Sofia',
            goodsDescription: 'Goods',
          }),
        }),
      );
      expect(seizureDeadlines.generateFromSeizure).toHaveBeenCalledWith(
        'm1',
        'sz1',
        expect.any(Date),
        'u1',
      );
    });
  });

  describe('updateSeizure', () => {
    it('throws when seizure is missing', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(null);
      await expect(
        service.updateSeizure('missing', { customsOffice: 'Varna' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects invalid linked matter', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(baseSeizure());
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.updateSeizure('sz1', { linkedMatterId: 'bad' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates seizure fields', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(baseSeizure());
      prisma.customsSeizure.update.mockResolvedValue({
        ...baseSeizure({ customsOffice: 'Varna', status: 'closed' }),
        _count: { custodyLogs: 0, applications: 0 },
      });

      const result = await service.updateSeizure('sz1', {
        customsOffice: ' Varna ',
        status: 'closed',
      });

      expect(result.customsOffice).toBe('Varna');
      expect(result.status).toBe('closed');
    });
  });

  describe('addCustody', () => {
    it('throws when seizure is missing', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(null);
      await expect(
        service.addCustody(
          'missing',
          { action: 'received', occurredAt: '2026-01-02' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects document from another matter', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(baseSeizure());
      prisma.matterDocumentVersion.findUnique.mockResolvedValue({
        id: 'dv1',
        document: { matterId: 'other' },
      });
      await expect(
        service.addCustody(
          'sz1',
          {
            action: 'received',
            occurredAt: '2026-01-02',
            documentVersionId: 'dv1',
          },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates custody log', async () => {
      prisma.customsSeizure.findUnique.mockResolvedValue(baseSeizure());
      prisma.custodyLog.create.mockResolvedValue({
        id: 'cl1',
        action: 'received',
        occurredAt: new Date('2026-01-02'),
        notes: 'Note',
        actorUser: user,
        documentVersion: null,
        createdAt: new Date('2026-01-02'),
      });

      const result = await service.addCustody(
        'sz1',
        {
          action: 'received',
          occurredAt: '2026-01-02',
          notes: ' Note ',
        },
        'u1',
      );

      expect(result.id).toBe('cl1');
      expect(prisma.custodyLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Note',
            actorUserId: 'u1',
          }),
        }),
      );
    });
  });

  describe('listApplications', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listApplications('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns serialized applications', async () => {
      prisma.matter.findUnique.mockResolvedValue(borderMatter);
      prisma.customsApplication.findMany.mockResolvedValue([
        {
          id: 'app1',
          matterId: 'm1',
          seizureId: null,
          authority: 'Customs',
          applicationNumber: null,
          submittedDate: null,
          validFrom: null,
          validUntil: null,
          status: 'draft',
          renewalOfId: null,
          createdById: 'u1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user,
        },
      ]);

      const result = await service.listApplications('m1');
      expect(result).toHaveLength(1);
      expect(result[0].authority).toBe('Customs');
    });
  });

  describe('createApplication', () => {
    it('rejects seizure not on matter', async () => {
      prisma.matter.findUnique.mockResolvedValue(borderMatter);
      prisma.customsSeizure.findFirst.mockResolvedValue(null);
      await expect(
        service.createApplication(
          'm1',
          { authority: 'Customs', seizureId: 'bad' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates application', async () => {
      prisma.matter.findUnique.mockResolvedValue(borderMatter);
      prisma.customsApplication.create.mockResolvedValue({
        id: 'app1',
        matterId: 'm1',
        seizureId: null,
        authority: 'Customs',
        applicationNumber: null,
        submittedDate: null,
        validFrom: null,
        validUntil: null,
        status: 'draft',
        renewalOfId: null,
        createdById: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user,
      });

      const result = await service.createApplication(
        'm1',
        { authority: ' Customs ' },
        'u1',
      );

      expect(result.authority).toBe('Customs');
    });
  });

  describe('updateApplication', () => {
    it('throws when application is missing', async () => {
      prisma.customsApplication.findUnique.mockResolvedValue(null);
      await expect(
        service.updateApplication('missing', { authority: 'EU' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates application', async () => {
      prisma.customsApplication.findUnique.mockResolvedValue({ id: 'app1' });
      prisma.customsApplication.update.mockResolvedValue({
        id: 'app1',
        matterId: 'm1',
        seizureId: null,
        authority: 'EU Customs',
        applicationNumber: 'N-1',
        submittedDate: null,
        validFrom: null,
        validUntil: null,
        status: 'approved',
        renewalOfId: null,
        createdById: 'u1',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user,
      });

      const result = await service.updateApplication('app1', {
        authority: ' EU Customs ',
        status: 'approved',
      });

      expect(result.authority).toBe('EU Customs');
      expect(result.status).toBe('approved');
    });
  });
});
