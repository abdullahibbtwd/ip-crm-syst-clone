import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ConflictCheckResult,
  ConflictResolution,
  IntakeEnquirerType,
  IntakeMatterType,
  IntakeStatus,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PortalAccessService } from '../common/portal-access.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntakeService } from './intake.service';

describe('IntakeService (core paths)', () => {
  let service: IntakeService;
  let prisma: {
    intakeLead: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    intakeConflictCheck: {
      create: jest.Mock;
      update: jest.Mock;
    };
    client: { findUnique: jest.Mock };
    user: { findMany: jest.Mock };
    matter: { count: jest.Mock };
    counterparty: {
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
      findFirst: jest.Mock;
    };
    contact: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let portalAccess: { requireScopeClientId: jest.Mock };
  let conflictCheck: { runCheck: jest.Mock };
  let clientsService: { createInTransaction: jest.Mock };
  let mattersService: { createFromIntake: jest.Mock };
  let deadlinesService: { generateInitialDeadlines: jest.Mock };
  let history: { log: jest.Mock };

  const staff = {
    userId: 'u1',
    roles: ['ip_attorney'],
    permissions: ['matter:create'],
  } as AuthenticatedUser;

  beforeEach(() => {
    prisma = {
      intakeLead: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      intakeConflictCheck: {
        create: jest.fn(),
        update: jest.fn(),
      },
      client: { findUnique: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      matter: { count: jest.fn().mockResolvedValue(0) },
      counterparty: {
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
      contact: { create: jest.fn() },
      $transaction: jest.fn(async (fn) =>
        typeof fn === 'function' ? fn(prisma) : Promise.all(fn),
      ),
    };
    portalAccess = { requireScopeClientId: jest.fn().mockReturnValue(null) };
    conflictCheck = { runCheck: jest.fn().mockResolvedValue([]) };
    clientsService = {
      createInTransaction: jest.fn().mockResolvedValue({
        id: 'c1',
        internalCode: 'CL-001',
      }),
    };
    mattersService = {
      createFromIntake: jest.fn().mockResolvedValue({
        id: 'm1',
        title: 'New matter',
      }),
    };
    deadlinesService = {
      generateInitialDeadlines: jest.fn().mockResolvedValue({ created: 1 }),
    };
    history = { log: jest.fn().mockResolvedValue(undefined) };

    service = new IntakeService(
      prisma as unknown as PrismaService,
      conflictCheck as never,
      clientsService as never,
      mattersService as never,
      deadlinesService as never,
      history as never,
      portalAccess as unknown as PortalAccessService,
    );
  });

  it('create rejects missing contact details', async () => {
    await expect(
      service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        staff,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('create stores internal lead', async () => {
    const created = { id: 'i1', status: IntakeStatus.new };
    prisma.intakeLead.create.mockResolvedValue(created);

    await expect(
      service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          email: 'ada@x.com',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        staff,
      ),
    ).resolves.toBe(created);

    expect(prisma.intakeLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'ada@x.com',
          createdById: 'u1',
          source: 'internal',
        }),
      }),
    );
  });

  it('findAll returns cursor page', async () => {
    prisma.intakeLead.findMany.mockResolvedValue([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ]);
    const result = await service.findAll({ limit: 2 } as never, staff);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('2');
  });

  it('findOne / update guard converted leads', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.converted,
    });
    await expect(
      service.update('i1', { notes: 'x' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('addCounterparty / removeCounterparty', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.new,
    });
    prisma.counterparty.create.mockResolvedValue({});
    prisma.counterparty.findFirst.mockResolvedValue({ id: 'cp1' });
    prisma.counterparty.delete.mockResolvedValue({});

    await service.addCounterparty('i1', {
      name: 'Rival Co',
      relationship: 'competitor',
    } as never);
    await service.removeCounterparty('i1', 'cp1');

    expect(prisma.counterparty.create).toHaveBeenCalled();
    expect(prisma.counterparty.delete).toHaveBeenCalledWith({
      where: { id: 'cp1' },
    });
  });

  it('countPending scopes for portal', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    prisma.intakeLead.count.mockResolvedValue(3);
    await expect(service.countPending(staff)).resolves.toEqual({ count: 3 });
    expect(prisma.intakeLead.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ submittedClientId: 'c1' }),
      }),
    );
  });

  it('create portal submission auto-runs conflict check', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    const created = {
      id: 'i1',
      status: IntakeStatus.new,
      counterparties: [],
    };
    prisma.intakeLead.create.mockResolvedValue(created);
    prisma.intakeLead.findUnique.mockResolvedValue(created);

    await service.create(
      {
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Ada',
        email: 'ada@x.com',
        matterType: IntakeMatterType.trademark,
        description: 'Mark',
      } as never,
      { ...staff, roles: ['portal_client'] },
    );

    expect(conflictCheck.runCheck).toHaveBeenCalled();
    expect(prisma.intakeConflictCheck.create).toHaveBeenCalled();
  });

  it('runConflictCheck flags hits and updates status', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.new,
      companyName: null,
      fullName: 'Ada',
      country: 'DE',
      email: 'ada@x.com',
      phone: null,
      description: 'Mark',
      counterparties: [],
      conflictChecks: [],
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);
    conflictCheck.runCheck.mockResolvedValue([{ type: 'client', id: 'c9' }]);

    const result = await service.runConflictCheck('i1');

    expect(prisma.intakeConflictCheck.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: ConflictCheckResult.flagged,
          resolution: ConflictResolution.pending,
        }),
      }),
    );
    expect(prisma.intakeLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: IntakeStatus.conflict_flagged },
      }),
    );
    expect(result).toBeDefined();
  });

  it('resolveConflict approves flagged lead', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.conflict_flagged,
      conflictChecks: [
        { id: 'cc1', result: ConflictCheckResult.flagged },
      ],
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);

    await service.resolveConflict(
      'i1',
      { decision: 'approved', note: 'ok' } as never,
      'u1',
    );

    expect(prisma.intakeConflictCheck.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          resolution: ConflictResolution.approved,
          resolvedById: 'u1',
        }),
      }),
    );
    expect(prisma.intakeLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: IntakeStatus.approved },
      }),
    );
  });

  it('convert requires matter:create permission', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.approved,
    });

    await expect(
      service.convert('i1', { gdprConsent: true } as never, {
        ...staff,
        permissions: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('convert creates client, matter, and deadlines for approved lead', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.approved,
      enquirerType: IntakeEnquirerType.individual,
      fullName: 'Ada Lovelace',
      email: 'ada@x.com',
      phone: null,
      companyName: null,
      country: 'DE',
      matterType: IntakeMatterType.trademark,
      assignedUserId: 'u1',
      submittedClientId: null,
      notes: null,
      source: 'internal',
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);

    await service.convert('i1', { gdprConsent: true } as never, staff);

    expect(clientsService.createInTransaction).toHaveBeenCalled();
    expect(mattersService.createFromIntake).toHaveBeenCalled();
    expect(deadlinesService.generateInitialDeadlines).toHaveBeenCalledWith('m1');
    expect(history.log).toHaveBeenCalled();
  });

  it('updateOwn rejects cross-client portal access', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.new,
      submittedClientId: 'c2',
    });

    await expect(
      service.updateOwn(
        'i1',
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          email: 'ada@x.com',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        { ...staff, roles: ['portal_client'] },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('create validates enquirer-specific fields', async () => {
    await expect(
      service.create(
        {
          enquirerType: IntakeEnquirerType.company,
          email: 'a@x.com',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        staff,
      ),
    ).rejects.toThrow(/Company name is required/);
  });

  it('create rejects invalid counterparties', async () => {
    await expect(
      service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          email: 'ada@x.com',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
          counterparties: [{ relationship: 'competitor' }],
        } as never,
        staff,
      ),
    ).rejects.toThrow(/Counterparty 1/);
  });

  it('updateOwn updates lead and re-runs conflict check', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    const lead = {
      id: 'i1',
      status: IntakeStatus.new,
      submittedClientId: 'c1',
      counterparties: [],
      conflictChecks: [],
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);

    await service.updateOwn(
      'i1',
      {
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Ada Updated',
        email: 'ada@x.com',
        matterType: IntakeMatterType.trademark,
        description: 'Updated mark',
      } as never,
      { ...staff, roles: ['portal_client'] },
    );

    expect(prisma.counterparty.deleteMany).toHaveBeenCalledWith({
      where: { intakeLeadId: 'i1' },
    });
    expect(conflictCheck.runCheck).toHaveBeenCalled();
  });

  it('findOneForUser enforces portal ownership', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      submittedClientId: 'c1',
      status: IntakeStatus.new,
    });
    await expect(
      service.findOneForUser('i1', { ...staff, roles: ['portal_client'] }),
    ).resolves.toMatchObject({ id: 'i1' });
  });

  it('runConflictCheck clears lead when no hits', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.new,
      companyName: null,
      fullName: 'Ada',
      country: 'DE',
      email: 'ada@x.com',
      phone: null,
      description: 'Mark',
      counterparties: [],
      conflictChecks: [],
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);
    conflictCheck.runCheck.mockResolvedValue([]);

    await service.runConflictCheck('i1');

    expect(prisma.intakeLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: IntakeStatus.approved },
      }),
    );
  });

  it('runConflictCheck rejects converted leads', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.converted,
    });
    await expect(service.runConflictCheck('i1')).rejects.toThrow(
      /already converted/,
    );
  });

  it('resolveConflict rejects non-flagged leads', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.approved,
      conflictChecks: [],
    });
    await expect(
      service.resolveConflict(
        'i1',
        { decision: 'approved', note: 'ok' } as never,
        'u1',
      ),
    ).rejects.toThrow(/not awaiting conflict review/);
  });

  it('resolveConflict rejects lead when decision is rejected', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.conflict_flagged,
      conflictChecks: [
        { id: 'cc1', result: ConflictCheckResult.flagged },
      ],
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);

    await service.resolveConflict(
      'i1',
      { decision: 'rejected', note: 'conflict' } as never,
      'u1',
    );

    expect(prisma.intakeLead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: IntakeStatus.rejected },
      }),
    );
  });

  it('convert requires GDPR consent for new clients', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.approved,
      submittedClientId: null,
    });
    await expect(
      service.convert('i1', {} as never, staff),
    ).rejects.toThrow(/GDPR consent is required/);
  });

  it('convert uses existing portal client without creating a new one', async () => {
    const lead = {
      id: 'i1',
      status: IntakeStatus.approved,
      enquirerType: IntakeEnquirerType.individual,
      fullName: 'Ada Lovelace',
      email: 'ada@x.com',
      phone: null,
      companyName: null,
      country: 'DE',
      matterType: IntakeMatterType.trademark,
      assignedUserId: 'u1',
      submittedClientId: 'c-portal',
      notes: null,
      source: 'portal',
    };
    prisma.intakeLead.findUnique.mockResolvedValue(lead);
    prisma.client.findUnique.mockResolvedValue({
      id: 'c-portal',
      internalCode: 'CL-PORTAL',
    });

    await service.convert('i1', {} as never, staff);

    expect(clientsService.createInTransaction).not.toHaveBeenCalled();
    expect(mattersService.createFromIntake).toHaveBeenCalled();
    expect(prisma.contact.create).not.toHaveBeenCalled();
  });

  it('portal create auto-assigns attorney by workload', async () => {
    portalAccess.requireScopeClientId.mockReturnValue('c1');
    prisma.user.findMany.mockResolvedValue([{ id: 'att1' }]);
    prisma.matter.count.mockResolvedValue(1);
    prisma.intakeLead.count.mockResolvedValue(0);
    const created = {
      id: 'i1',
      status: IntakeStatus.new,
      counterparties: [],
    };
    prisma.intakeLead.create.mockResolvedValue(created);
    prisma.intakeLead.findUnique.mockResolvedValue(created);

    await service.create(
      {
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Ada',
        email: 'ada@x.com',
        matterType: IntakeMatterType.patent,
        description: 'Patent filing',
      } as never,
      { ...staff, roles: ['portal_client'] },
    );

    expect(prisma.intakeLead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedUserId: 'att1',
          source: 'portal',
          submittedClientId: 'c1',
        }),
      }),
    );
  });

  it('addCounterparty rejects converted leads', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.converted,
    });
    await expect(
      service.addCounterparty('i1', {
        name: 'Rival',
        relationship: 'competitor',
      } as never),
    ).rejects.toThrow(/Converted leads cannot be edited/);
  });

  it('removeCounterparty throws when counterparty is missing', async () => {
    prisma.intakeLead.findUnique.mockResolvedValue({
      id: 'i1',
      status: IntakeStatus.new,
    });
    prisma.counterparty.findFirst.mockResolvedValue(null);
    await expect(
      service.removeCounterparty('i1', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('additional branch coverage', () => {
    it('create accepts phone-only contact details', async () => {
      prisma.intakeLead.create.mockResolvedValue({ id: 'i1' });
      await service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          phone: '+491234567',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        staff,
      );
      expect(prisma.intakeLead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: '+491234567', email: undefined }),
        }),
      );
    });

    it('create stores company enquiries with counterparties', async () => {
      prisma.intakeLead.create.mockResolvedValue({ id: 'i1' });
      await service.create(
        {
          enquirerType: IntakeEnquirerType.company,
          companyName: 'Acme GmbH',
          email: 'info@acme.de',
          matterType: IntakeMatterType.design,
          description: 'Design filing',
          counterparties: [{ name: 'Rival', relationship: 'competitor' }],
        } as never,
        staff,
      );
      expect(prisma.intakeLead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            companyName: 'Acme GmbH',
            counterparties: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ name: 'Rival' }),
              ]),
            }),
          }),
        }),
      );
    });

    it('findAll applies search filter and cursor', async () => {
      prisma.intakeLead.findMany.mockResolvedValue([{ id: '2' }]);
      await service.findAll(
        { limit: 10, search: 'Acme', cursor: '1' } as never,
        staff,
      );
      expect(prisma.intakeLead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                companyName: { contains: 'Acme', mode: 'insensitive' },
              }),
            ]),
          }),
          cursor: { id: '1' },
          skip: 1,
        }),
      );
    });

    it('update edits non-converted leads', async () => {
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.new,
      });
      prisma.intakeLead.update.mockResolvedValue({ id: 'i1', notes: 'updated' });
      await service.update('i1', { notes: 'updated' } as never);
      expect(prisma.intakeLead.update).toHaveBeenCalled();
    });

    it('updateOwn rejects rejected portal leads', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.rejected,
        submittedClientId: 'c1',
      });
      await expect(
        service.updateOwn(
          'i1',
          {
            enquirerType: IntakeEnquirerType.individual,
            fullName: 'Ada',
            email: 'ada@x.com',
            matterType: IntakeMatterType.trademark,
            description: 'Mark',
          } as never,
          { ...staff, roles: ['portal_client'] },
        ),
      ).rejects.toThrow(/Rejected enquiries/);
    });

    it('findOneForUser rejects cross-client portal access', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        submittedClientId: 'c2',
        status: IntakeStatus.new,
      });
      await expect(
        service.findOneForUser('i1', { ...staff, roles: ['portal_client'] }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('runConflictCheck rejects rejected leads', async () => {
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.rejected,
      });
      await expect(service.runConflictCheck('i1')).rejects.toThrow(
        /Rejected leads cannot be checked/,
      );
    });

    it('resolveConflict supports overridden decision', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.conflict_flagged,
        conflictChecks: [{ id: 'cc1', result: ConflictCheckResult.flagged }],
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);
      await service.resolveConflict(
        'i1',
        { decision: 'overridden', note: 'proceed anyway' } as never,
        'u1',
      );
      expect(prisma.intakeConflictCheck.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolution: ConflictResolution.overridden,
          }),
        }),
      );
    });

    it('convert creates company client and primary contact', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.company,
        companyName: 'Acme GmbH',
        fullName: null,
        email: 'info@acme.de',
        phone: '+49123',
        country: 'DE',
        matterType: IntakeMatterType.trademark,
        assignedUserId: 'u1',
        submittedClientId: null,
        notes: null,
        source: 'internal',
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);

      await service.convert('i1', { gdprConsent: true } as never, staff);

      expect(clientsService.createInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          type: 'company',
          companyName: 'Acme GmbH',
        }),
      );
      expect(prisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Primary',
            lastName: 'Contact',
          }),
        }),
      );
    });

    it('convert auto-assigns attorney via fallback roles when no specialist exists', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Ada',
        email: 'ada@x.com',
        phone: null,
        companyName: null,
        country: 'DE',
        matterType: IntakeMatterType.other,
        assignedUserId: null,
        submittedClientId: null,
        notes: null,
        source: 'internal',
      };
      prisma.intakeLead.findUnique
        .mockResolvedValueOnce(lead)
        .mockResolvedValueOnce({ ...lead, assignedUserId: 'mp1' });
      prisma.user.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'mp1' }]);
      prisma.matter.count.mockResolvedValue(0);
      prisma.intakeLead.count.mockResolvedValue(0);

      await service.convert('i1', { gdprConsent: true } as never, staff);

      expect(prisma.intakeLead.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { assignedUserId: 'mp1' },
        }),
      );
    });

    it('convert rejects non-approved leads', async () => {
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.new,
      });
      await expect(
        service.convert('i1', { gdprConsent: true } as never, staff),
      ).rejects.toThrow(/must be approved/);
    });

    it('resolveConflict rejects when latest check is not flagged', async () => {
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.conflict_flagged,
        conflictChecks: [{ id: 'cc1', result: ConflictCheckResult.clear }],
      });
      await expect(
        service.resolveConflict(
          'i1',
          { decision: 'approved', note: 'ok' } as never,
          'u1',
        ),
      ).rejects.toThrow(/No flagged conflict check/);
    });

    it('findAll returns undefined cursor when page is exact size', async () => {
      prisma.intakeLead.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.findAll({ limit: 2 } as never, staff);
      expect(result.nextCursor).toBeUndefined();
    });

    it('create portal submission skips auto-assign when no attorneys exist', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.user.findMany.mockResolvedValue([]);
      const created = { id: 'i1', status: IntakeStatus.new, counterparties: [] };
      prisma.intakeLead.create.mockResolvedValue(created);
      prisma.intakeLead.findUnique.mockResolvedValue(created);

      await service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Ada',
          email: 'ada@x.com',
          matterType: IntakeMatterType.trademark,
          description: 'Mark',
        } as never,
        { ...staff, roles: ['portal_client'] },
      );

      expect(prisma.intakeLead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedUserId: undefined,
          }),
        }),
      );
    });

    it('convert uses existing portal client without creating contact', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Ada Lovelace',
        email: 'ada@x.com',
        phone: '+49123',
        companyName: null,
        country: 'DE',
        matterType: IntakeMatterType.patent,
        assignedUserId: 'u1',
        submittedClientId: 'c-portal',
        notes: 'Notes',
        source: 'portal',
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);
      prisma.client.findUnique.mockResolvedValue({
        id: 'c-portal',
        internalCode: 'CL-PORTAL',
      });

      await service.convert('i1', {} as never, staff);
      expect(clientsService.createInTransaction).not.toHaveBeenCalled();
      expect(prisma.contact.create).not.toHaveBeenCalled();
    });

    it('convert rejects already-converted leads', async () => {
      prisma.intakeLead.findUnique.mockResolvedValue({
        id: 'i1',
        status: IntakeStatus.converted,
      });
      await expect(
        service.convert('i1', { gdprConsent: true } as never, staff),
      ).rejects.toThrow(/already converted/);
    });

    it('convert skips primary contact when lead has no email or phone', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'No Contact',
        email: null,
        phone: null,
        companyName: null,
        country: 'DE',
        matterType: IntakeMatterType.design,
        assignedUserId: 'u1',
        submittedClientId: null,
        notes: null,
        source: 'internal',
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.matter.count.mockResolvedValue(0);
      prisma.intakeLead.count.mockResolvedValue(0);

      await service.convert('i1', { gdprConsent: true } as never, staff);
      expect(prisma.contact.create).not.toHaveBeenCalled();
    });

    it('convert creates individual with single-token name as lastName fallback', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Madonna',
        email: 'm@x.com',
        phone: null,
        companyName: null,
        country: 'DE',
        matterType: IntakeMatterType.utility_model,
        assignedUserId: 'u1',
        submittedClientId: null,
        notes: null,
        source: 'internal',
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);
      prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
      prisma.matter.count.mockResolvedValue(0);
      prisma.intakeLead.count.mockResolvedValue(0);

      await service.convert('i1', { gdprConsent: true } as never, staff);

      expect(clientsService.createInTransaction).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstName: 'Madonna',
          lastName: 'Madonna',
        }),
      );
    });

    it('portal create assigns trademark attorney for design enquiries', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.user.findMany.mockResolvedValue([{ id: 'tm1' }]);
      prisma.matter.count.mockResolvedValue(0);
      prisma.intakeLead.count.mockResolvedValue(0);
      const created = { id: 'i1', status: IntakeStatus.new, counterparties: [] };
      prisma.intakeLead.create.mockResolvedValue(created);
      prisma.intakeLead.findUnique.mockResolvedValue(created);

      await service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Designer',
          email: 'd@x.com',
          matterType: IntakeMatterType.design,
          description: 'Design mark',
        } as never,
        { ...staff, roles: ['portal_client'] },
      );

      expect(prisma.intakeLead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assignedUserId: 'tm1' }),
        }),
      );
    });

    it('convert logs history for existing portal client conversion', async () => {
      const lead = {
        id: 'i1',
        status: IntakeStatus.approved,
        enquirerType: IntakeEnquirerType.individual,
        fullName: 'Portal User',
        email: 'p@x.com',
        phone: null,
        companyName: null,
        country: 'DE',
        matterType: IntakeMatterType.other,
        assignedUserId: 'u1',
        submittedClientId: 'c-portal',
        notes: null,
        source: 'portal',
      };
      prisma.intakeLead.findUnique.mockResolvedValue(lead);
      prisma.client.findUnique.mockResolvedValue({
        id: 'c-portal',
        internalCode: 'CL-P',
      });

      await service.convert('i1', {} as never, staff);

      expect(history.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Portal intake converted'),
        }),
      );
    });

    it('portal create assigns IP attorney for patent enquiries', async () => {
      portalAccess.requireScopeClientId.mockReturnValue('c1');
      prisma.user.findMany.mockResolvedValue([{ id: 'ip1' }]);
      prisma.matter.count.mockResolvedValue(0);
      prisma.intakeLead.count.mockResolvedValue(0);
      const created = { id: 'i2', status: IntakeStatus.new, counterparties: [] };
      prisma.intakeLead.create.mockResolvedValue(created);
      prisma.intakeLead.findUnique.mockResolvedValue(created);

      await service.create(
        {
          enquirerType: IntakeEnquirerType.individual,
          fullName: 'Inventor',
          email: 'i@x.com',
          matterType: IntakeMatterType.patent,
          description: 'Patent app',
        } as never,
        { ...staff, roles: ['portal_client'] },
      );

      expect(prisma.intakeLead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ assignedUserId: 'ip1' }),
        }),
      );
    });
  });
});
