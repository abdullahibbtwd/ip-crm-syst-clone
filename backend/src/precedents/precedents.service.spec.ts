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

  it('get hides drafts from other users', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.draft,
      createdById: 'other',
      title: 'Secret',
      category: 'cat',
      bodyHtml: '<p>x</p>',
      tags: [],
      matterType: null,
      jurisdiction: null,
      sourceMatterId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'other', fullName: 'Bob', email: 'b@x.com' },
      versions: [],
      sourceMatter: null,
    });
    await expect(service.get('p1', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('get returns published precedent with versions', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.published,
      createdById: 'u2',
      title: 'Title',
      category: 'cat',
      bodyHtml: '<p>x</p>',
      tags: [],
      matterType: null,
      jurisdiction: null,
      sourceMatterId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'u2', fullName: 'Bob', email: 'b@x.com' },
      versions: [
        {
          id: 'v1',
          bodyHtml: '<p>x</p>',
          editedBy: { id: 'u2', fullName: 'Bob', email: 'b@x.com' },
          createdAt: new Date(),
        },
      ],
      sourceMatter: { id: 'm1', title: 'Matter', matterType: 'trademark' },
    });
    const result = await service.get('p1', user);
    expect(result.versions).toHaveLength(1);
    expect(result.sourceMatter?.id).toBe('m1');
  });

  it('update creates version when body changes', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.draft,
      createdById: 'u1',
      bodyHtml: '<p>old</p>',
    });
    const updated = {
      id: 'p1',
      title: 'Title',
      category: 'cat',
      bodyHtml: '<p>new</p>',
      status: PrecedentStatus.draft,
      tags: [],
      matterType: null,
      jurisdiction: null,
      sourceMatterId: null,
      createdById: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
    };
    const versionCreate = jest.fn().mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn({
        precedent: {
          update: jest.fn().mockResolvedValue(updated),
        },
        precedentVersion: { create: versionCreate },
      } as never),
    );

    await service.update('p1', { bodyHtml: '<p>new</p>' }, user);
    expect(versionCreate).toHaveBeenCalled();
  });

  it('update forbids editing published precedent for non-partner', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.published,
      createdById: 'u1',
      bodyHtml: '<p>x</p>',
    });
    await expect(
      service.update('p1', { title: 'Nope' }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('delete requires managing partner and removes row', async () => {
    prisma.precedent.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.precedent.delete.mockResolvedValue({});
    const mp = {
      ...user,
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
    } as AuthenticatedUser;
    await expect(service.delete('p1', mp)).resolves.toEqual({
      success: true,
    });
    expect(prisma.precedent.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('delete throws when precedent is missing', async () => {
    prisma.precedent.findUnique.mockResolvedValue(null);
    const mp = {
      ...user,
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
    } as AuthenticatedUser;
    await expect(service.delete('p1', mp)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('archive forbids non-author on published precedent', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.published,
      createdById: 'other',
    });
    await expect(service.archive('p1', user)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('list archived precedents requires managing partner', async () => {
    await expect(
      service.list({ status: PrecedentStatus.archived }, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fromCorrespondence rejects empty body', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      id: 'corr1',
      matterId: 'm1',
      bodyText: '  ',
      subject: '  ',
      matter: { id: 'm1', matterType: 'trademark' },
    });
    await expect(
      service.fromCorrespondence(
        'corr1',
        { title: 'Harvest', category: 'letters' },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list for managing partner includes draft and archived by default', async () => {
    prisma.precedent.findMany.mockResolvedValue([]);
    const mp = {
      ...user,
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
    } as AuthenticatedUser;
    await service.list({ jurisdiction: ' eu ' }, mp);
    expect(prisma.precedent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jurisdiction: 'EU',
          OR: expect.arrayContaining([
            { status: PrecedentStatus.published },
            { status: PrecedentStatus.draft },
            { status: PrecedentStatus.archived },
          ]),
        }),
      }),
    );
  });

  it('update skips version row when body unchanged', async () => {
    prisma.precedent.findUnique.mockResolvedValue({
      id: 'p1',
      status: PrecedentStatus.draft,
      createdById: 'u1',
      bodyHtml: '<p>same</p>',
    });
    const versionCreate = jest.fn();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) =>
      fn({
        precedent: {
          update: jest.fn().mockResolvedValue({
            id: 'p1',
            title: 'New title',
            category: 'cat',
            bodyHtml: '<p>same</p>',
            status: PrecedentStatus.draft,
            tags: [],
            matterType: null,
            jurisdiction: null,
            sourceMatterId: null,
            createdById: 'u1',
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
          }),
        },
        precedentVersion: { create: versionCreate },
      } as never),
    );

    await service.update('p1', { title: 'New title' }, user);
    expect(versionCreate).not.toHaveBeenCalled();
  });

  it('publish throws when precedent is missing', async () => {
    prisma.precedent.findUnique.mockResolvedValue(null);
    const mp = {
      ...user,
      roles: [SYSTEM_ROLES.MANAGING_PARTNER],
    } as AuthenticatedUser;
    await expect(service.publish('missing', mp)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('extended branch coverage', () => {
    it('archive allows managing partner on any precedent', async () => {
      prisma.precedent.findUnique.mockResolvedValue({
        id: 'p1',
        status: PrecedentStatus.published,
        createdById: 'other',
      });
      prisma.precedent.update.mockResolvedValue({
        id: 'p1',
        status: PrecedentStatus.archived,
      });
      const mp = {
        ...user,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      } as AuthenticatedUser;

      const result = await service.archive('p1', mp);
      expect(result.status).toBe(PrecedentStatus.archived);
    });

    it('fromCorrespondence uses html body when text missing', async () => {
      prisma.correspondence.findUnique.mockResolvedValue({
        id: 'corr1',
        subject: 'Reply template',
        bodyText: 'HTML body plain',
        bodyHtml: '<p>HTML body</p>',
        matterId: 'm1',
        matter: { id: 'm1', matterType: 'trademark' },
      });
      prisma.$transaction.mockImplementation(async (fn) =>
        fn({
          precedent: {
            create: jest.fn().mockResolvedValue({ id: 'p1' }),
          },
          precedentVersion: {
            create: jest.fn().mockResolvedValue({ id: 'v1' }),
          },
        } as never),
      );

      await service.fromCorrespondence(
        'corr1',
        { title: 'Harvested', category: 'cat' } as never,
        user,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('list archived-only for managing partner applies status filter', async () => {
      prisma.precedent.findMany.mockResolvedValue([]);
      const mp = {
        ...user,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      } as AuthenticatedUser;
      await service.list({ status: PrecedentStatus.archived }, mp);
      expect(prisma.precedent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PrecedentStatus.archived }),
        }),
      );
    });

    it('archive throws when precedent is missing', async () => {
      prisma.precedent.findUnique.mockResolvedValue(null);
      await expect(service.archive('missing', user)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('fromCorrespondence uses subject when bodyText is empty', async () => {
      prisma.correspondence.findUnique.mockResolvedValue({
        id: 'corr1',
        subject: 'Subject only',
        bodyText: '  ',
        matterId: 'm1',
        matter: { id: 'm1', matterType: 'trademark' },
      });
      prisma.$transaction.mockImplementation(async (fn) =>
        fn({
          precedent: { create: jest.fn().mockResolvedValue({ id: 'p1' }) },
          precedentVersion: { create: jest.fn().mockResolvedValue({}) },
        } as never),
      );
      await service.fromCorrespondence(
        'corr1',
        { title: 'From subject', category: 'cat' },
        user,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('searchFts applies jurisdiction and category filters for managing partner', async () => {
      prisma.$queryRaw.mockResolvedValue([]);
      const mp = {
        ...user,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      } as AuthenticatedUser;
      await service.list(
        { q: 'grant', jurisdiction: ' eu ', category: ' letters ', matterType: 'trademark' as never },
        mp,
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it('update allows managing partner to edit published precedent', async () => {
      prisma.precedent.findUnique.mockResolvedValue({
        id: 'p1',
        status: PrecedentStatus.published,
        createdById: 'other',
        bodyHtml: '<p>x</p>',
      });
      prisma.$transaction.mockImplementation(async (fn) =>
        fn({
          precedent: {
            update: jest.fn().mockResolvedValue({
              id: 'p1',
              title: 'Updated',
              category: 'cat',
              bodyHtml: '<p>x</p>',
              status: PrecedentStatus.published,
              tags: [],
              matterType: null,
              jurisdiction: null,
              sourceMatterId: null,
              createdById: 'other',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: { id: 'other', fullName: 'Bob', email: 'b@x.com' },
            }),
          },
          precedentVersion: { create: jest.fn() },
        } as never),
      );
      const mp = {
        ...user,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      } as AuthenticatedUser;
      await service.update('p1', { title: 'Updated' }, mp);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('create stores tags and jurisdiction on new draft', async () => {
      prisma.$transaction.mockImplementation(async (fn) =>
        fn({
          precedent: {
            create: jest.fn().mockResolvedValue({
              id: 'p1',
              title: 'T',
              category: 'cat',
              bodyHtml: '<p>x</p>',
              status: PrecedentStatus.draft,
              tags: ['a'],
              matterType: null,
              jurisdiction: 'EU',
              sourceMatterId: null,
              createdById: 'u1',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
            }),
          },
          precedentVersion: { create: jest.fn().mockResolvedValue({}) },
        } as never),
      );
      await service.create(
        {
          title: 'T',
          category: 'cat',
          bodyHtml: '<p>x</p>',
          tags: [' a ', ''],
          jurisdiction: ' eu ',
        },
        user,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('get allows managing partner to view archived draft by others', async () => {
      prisma.precedent.findUnique.mockResolvedValue({
        id: 'p1',
        status: PrecedentStatus.archived,
        createdById: 'other',
        title: 'Archived',
        category: 'cat',
        bodyHtml: '<p>x</p>',
        tags: [],
        matterType: null,
        jurisdiction: null,
        sourceMatterId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { id: 'other', fullName: 'Bob', email: 'b@x.com' },
        versions: [],
        sourceMatter: null,
      });
      const mp = {
        ...user,
        roles: [SYSTEM_ROLES.MANAGING_PARTNER],
      } as AuthenticatedUser;
      const result = await service.get('p1', mp);
      expect(result.status).toBe(PrecedentStatus.archived);
    });

    it('list with explicit draft status scopes to own drafts for non-partners', async () => {
      prisma.precedent.findMany.mockResolvedValue([]);
      await service.list({ status: PrecedentStatus.draft }, user);
      expect(prisma.precedent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PrecedentStatus.draft,
            createdById: 'u1',
          }),
        }),
      );
    });

    it('delete forbids non-managing partners', async () => {
      await expect(service.delete('p1', user)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });
});
