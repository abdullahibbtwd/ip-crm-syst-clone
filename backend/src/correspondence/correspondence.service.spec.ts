import { NotFoundException } from '@nestjs/common';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
  DocumentCategory,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CorrespondenceService } from './correspondence.service';

describe('CorrespondenceService (core paths)', () => {
  let service: CorrespondenceService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    correspondence: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
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
      correspondence: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
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
  });
});
