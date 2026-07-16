import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrecedentStatus } from '../../generated/prisma/client';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { PrecedentsService } from './precedents.service';

describe('PrecedentsService', () => {
  const prisma = {
    precedent: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    correspondence: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const service = new PrecedentsService(prisma as unknown as PrismaService);

  const user = {
    userId: 'u1',
    roles: [SYSTEM_ROLES.IP_ATTORNEY],
  } as AuthenticatedUser;

  beforeEach(() => jest.clearAllMocks());

  it('list queries published and own drafts for non-managing partners', async () => {
    prisma.precedent.findMany.mockResolvedValue([]);
    await service.list({}, user);
    expect(prisma.precedent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { status: PrecedentStatus.published },
            { status: PrecedentStatus.draft, createdById: 'u1' },
          ]),
        }),
      }),
    );
  });

  it('get throws when precedent is missing', async () => {
    prisma.precedent.findUnique.mockResolvedValue(null);
    await expect(service.get('missing', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('create persists draft precedent and initial version', async () => {
    const created = {
      id: 'p1',
      title: 'Title',
      category: 'cat',
      bodyHtml: '<p>x</p>',
      status: PrecedentStatus.draft,
      createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
      tags: [],
      matterType: null,
      jurisdiction: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn({
        precedent: {
          create: jest.fn().mockResolvedValue(created),
        },
        precedentVersion: {
          create: jest.fn().mockResolvedValue({}),
        },
      } as never),
    );

    const result = await service.create(
      {
        title: 'Title',
        category: 'cat',
        bodyHtml: '<p>x</p>',
      },
      user,
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'p1', title: 'Title' });
  });

  it('publish requires managing partner', async () => {
    await expect(service.publish('p1', user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('publish updates status for managing partner', async () => {
    prisma.precedent.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.precedent.update.mockResolvedValue({
      id: 'p1',
      title: 'Title',
      category: 'cat',
      bodyHtml: '<p>x</p>',
      status: PrecedentStatus.published,
      tags: [],
      matterType: null,
      jurisdiction: null,
      sourceMatterId: null,
      createdById: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });
    const mp = {
      ...user,
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
    } as AuthenticatedUser;
    const result = await service.publish('p1', mp);
    expect(result.status).toBe(PrecedentStatus.published);
  });

  it('archive allows author on own draft', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.draft,
      createdById: 'u1',
    });
    prisma.precedent.update.mockResolvedValue({
      id: 'p1',
      title: 'Title',
      category: 'cat',
      bodyHtml: '<p>x</p>',
      status: PrecedentStatus.archived,
      tags: [],
      matterType: null,
      jurisdiction: null,
      sourceMatterId: null,
      createdById: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    });
    const result = await service.archive('p1', user);
    expect(result.status).toBe(PrecedentStatus.archived);
  });

  it('fromCorrespondence harvests body text into draft precedent', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      matterId: 'm1',
      bodyText: 'Dear client,\n\nPlease review.',
      subject: 'Subject',
      matter: { id: 'm1', matterType: 'trademark' },
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn({
        precedent: {
          create: jest.fn().mockResolvedValue({
            id: 'p2',
            title: 'Harvest',
            category: 'letters',
            bodyHtml: '<p>Dear client,<br/>Please review.</p>',
            status: PrecedentStatus.draft,
            tags: [],
            matterType: 'trademark',
            jurisdiction: null,
            sourceMatterId: 'm1',
            createdById: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          }),
        },
        precedentVersion: { create: jest.fn().mockResolvedValue({}) },
      } as never),
    );

    const result = await service.fromCorrespondence(
      'corr1',
      { title: 'Harvest', category: 'letters' },
      user,
    );
    expect(result.title).toBe('Harvest');
  });

  it('list uses FTS when q is provided', async () => {
    prisma.$queryRaw.mockResolvedValue([
      {
        id: 'p1',
        title: 'Title',
        matter_type: null,
        jurisdiction: null,
        category: 'cat',
        tags: [],
        body_html: '<p>x</p>',
        status: PrecedentStatus.published,
        source_matter_id: null,
        created_by_id: 'u1',
        created_at: new Date(),
        updated_at: new Date(),
        full_name: 'Ada',
        email: 'a@x.com',
      },
    ]);
    const rows = await service.list({ q: 'office action' }, user);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(rows[0].title).toBe('Title');
  });
});
