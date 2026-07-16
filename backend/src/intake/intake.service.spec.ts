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
});
