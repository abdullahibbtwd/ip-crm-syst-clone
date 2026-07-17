import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  CorrespondenceStatus,
  DocumentCategory,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CorrespondenceService } from './correspondence.service';

describe('CorrespondenceService (core paths)', () => {
  let service: CorrespondenceService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    matterDocumentVersion: { findFirst: jest.Mock };
    correspondence: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    matterTimelineEvent: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let officeActionDeadlines: { generateFromOfficeAction: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      matterDocumentVersion: { findFirst: jest.fn() },
      correspondence: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      matterTimelineEvent: { findMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn(async (fn) =>
        fn({
          correspondence: prisma.correspondence,
          matterTimelineEvent: prisma.matterTimelineEvent,
        }),
      ),
    };
    officeActionDeadlines = {
      generateFromOfficeAction: jest.fn().mockResolvedValue(undefined),
    };
    service = new CorrespondenceService(
      prisma as unknown as PrismaService,
      officeActionDeadlines as never,
    );
  });

  it('listForMatter / listTimeline require matter', async () => {
    prisma.matter.findUnique.mockResolvedValue(null);
    await expect(service.listForMatter('m1')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.correspondence.findMany.mockResolvedValue([]);
    prisma.matterTimelineEvent.findMany.mockResolvedValue([]);
    await expect(service.listForMatter('m1')).resolves.toEqual([]);
    await expect(service.listTimeline('m1')).resolves.toEqual([]);
  });

  it('create writes correspondence + timeline', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    const created = {
      id: 'corr1',
      subject: 'Hello',
      direction: CorrespondenceDirection.incoming,
      status: 'received',
      category: DocumentCategory.general,
      source: CorrespondenceSource.manual,
    };
    prisma.correspondence.create.mockResolvedValue(created);
    prisma.matterTimelineEvent.create.mockResolvedValue({});

    const result = await service.create(
      'm1',
      {
        direction: CorrespondenceDirection.incoming,
        category: DocumentCategory.general,
        correspondenceDate: '2026-01-15',
        sender: ' a@x.com ',
        recipient: ' b@y.com ',
        subject: ' Hello ',
        bodyText: 'Body',
      } as never,
      'u1',
    );

    expect(result).toBe(created);
    expect(prisma.correspondence.create).toHaveBeenCalled();
    expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
  });

  it('create triggers office-action deadlines', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.correspondence.create.mockResolvedValue({
      id: 'corr1',
      subject: 'OA',
      direction: CorrespondenceDirection.incoming,
      status: 'received',
      category: DocumentCategory.office_action,
      source: CorrespondenceSource.manual,
    });
    prisma.matterTimelineEvent.create.mockResolvedValue({});

    await service.create(
      'm1',
      {
        direction: CorrespondenceDirection.incoming,
        category: DocumentCategory.office_action,
        correspondenceDate: '2026-01-15',
        sender: 'office',
        recipient: 'us',
        subject: 'OA',
      } as never,
      'u1',
    );

    expect(officeActionDeadlines.generateFromOfficeAction).toHaveBeenCalledWith(
      'm1',
      'corr1',
      expect.any(Date),
      'u1',
    );
  });

  it('update throws when missing', async () => {
    prisma.correspondence.findUnique.mockResolvedValue(null);
    await expect(
      service.update('missing', { subject: 'x' } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listForPortalClient / findOneForPortal', async () => {
    prisma.correspondence.findMany.mockResolvedValue([]);
    prisma.correspondence.findFirst.mockResolvedValue(null);
    await expect(service.listForPortalClient('c1')).resolves.toEqual([]);
    await expect(
      service.findOneForPortal('corr1', 'c1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.correspondence.findFirst.mockResolvedValue({ id: 'corr1' });
    await expect(service.findOneForPortal('corr1', 'c1')).resolves.toEqual({
      id: 'corr1',
    });
  });

  it('create defaults outgoing correspondence to draft', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.correspondence.create.mockResolvedValue({
      id: 'corr2',
      subject: 'Reply',
      direction: CorrespondenceDirection.outgoing,
      status: CorrespondenceStatus.draft,
      category: DocumentCategory.general,
      source: CorrespondenceSource.manual,
      sender: 'us',
      recipient: 'them',
      bodyText: null,
    });
    prisma.matterTimelineEvent.create.mockResolvedValue({});

    await service.create(
      'm1',
      {
        direction: CorrespondenceDirection.outgoing,
        category: DocumentCategory.general,
        correspondenceDate: '2026-01-15',
        sender: 'us',
        recipient: 'them',
        subject: 'Reply',
      } as never,
      'u1',
    );

    expect(prisma.correspondence.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: CorrespondenceStatus.draft,
        }),
      }),
    );
    expect(prisma.matterTimelineEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: expect.stringContaining('Sent'),
        }),
      }),
    );
  });

  it('create rejects document version not on matter', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.matterDocumentVersion.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        'm1',
        {
          direction: CorrespondenceDirection.incoming,
          category: DocumentCategory.general,
          correspondenceDate: '2026-01-15',
          sender: 'a',
          recipient: 'b',
          subject: 'x',
          documentVersionId: 'bad',
        } as never,
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create logs office-action deadline failures without throwing', async () => {
    prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
    prisma.correspondence.create.mockResolvedValue({
      id: 'corr1',
      subject: 'OA',
      direction: CorrespondenceDirection.incoming,
      status: 'received',
      category: DocumentCategory.office_action,
      source: CorrespondenceSource.manual,
    });
    prisma.matterTimelineEvent.create.mockResolvedValue({});
    officeActionDeadlines.generateFromOfficeAction.mockRejectedValue(
      new Error('deadline failed'),
    );

    await expect(
      service.create(
        'm1',
        {
          direction: CorrespondenceDirection.incoming,
          category: DocumentCategory.office_action,
          correspondenceDate: '2026-01-15',
          sender: 'office',
          recipient: 'us',
          subject: 'OA',
        } as never,
        'u1',
      ),
    ).resolves.toBeDefined();
  });

  it('update clears portalReadAt when re-sharing to portal', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      matterId: 'm1',
    });
    prisma.correspondence.update.mockResolvedValue({ id: 'corr1' });

    await service.update('corr1', { isClientVisible: true } as never);

    expect(prisma.correspondence.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isClientVisible: true,
          portalReadAt: null,
        }),
      }),
    );
  });

  it('linkAutoFetchedDocument skips when document already linked', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      matterId: 'm1',
      documentVersionId: 'existing',
    });
    prisma.correspondence.findUniqueOrThrow.mockResolvedValue({ id: 'corr1' });

    const result = await service.linkAutoFetchedDocument('corr1', 'dv2', {
      epoDocId: '123',
    });

    expect(result).toEqual({ id: 'corr1' });
    expect(prisma.correspondence.update).not.toHaveBeenCalled();
  });

  it('linkAutoFetchedDocument merges metadata and promotes draft to received', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      matterId: 'm1',
      documentVersionId: null,
      status: CorrespondenceStatus.draft,
      metadata: { existing: true },
    });
    prisma.matterDocumentVersion.findFirst.mockResolvedValue({ id: 'dv1' });
    prisma.correspondence.update.mockResolvedValue({ id: 'corr1' });

    await service.linkAutoFetchedDocument('corr1', 'dv1', { epoDocId: '123' });

    expect(prisma.correspondence.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentVersionId: 'dv1',
          status: CorrespondenceStatus.received,
          metadata: expect.objectContaining({
            existing: true,
            epoDocId: '123',
            epoDocumentFetchStatus: 'ready',
            epoDocumentAutoFetched: true,
          }),
        }),
      }),
    );
  });

  it('mergeMetadata merges object metadata', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      metadata: { a: 1 },
    });
    prisma.correspondence.update.mockResolvedValue({ id: 'corr1' });

    await service.mergeMetadata('corr1', { b: 2 });

    expect(prisma.correspondence.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          metadata: { a: 1, b: 2 },
        },
      }),
    );
  });

  it('mergeMetadata throws when correspondence missing', async () => {
    prisma.correspondence.findUnique.mockResolvedValue(null);
    await expect(
      service.mergeMetadata('missing', { x: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
