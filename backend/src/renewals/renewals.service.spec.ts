import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeadlineStatus,
  FixedFeeCategory,
  IpRightStatus,
  MatterType,
  RenewalInstructionDecision,
  RenewalStatus,
} from '../../generated/prisma/client';
import type { InvoicesService } from '../invoices/invoices.service';
import type { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import type { RenewalDeadlinesService } from './renewal-deadlines.service';
import { RenewalsService } from './renewals.service';

function detailWindow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rw1',
    ipRightId: 'ipr1',
    matterId: 'm1',
    clientId: 'c1',
    cycleNumber: 1,
    jurisdiction: 'EU',
    dueDate: new Date('2030-01-15'),
    graceDate: new Date('2030-07-15'),
    status: RenewalStatus.upcoming,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ipRight: {
      id: 'ipr1',
      title: 'Mark',
      rightType: MatterType.trademark,
      jurisdiction: 'EU',
      registrationDate: new Date('2020-01-15'),
      filingDate: null,
    },
    parts: [],
    instructions: [],
    payments: [],
    deadlines: [],
    fixedFees: [],
    ...overrides,
  };
}

function worklistRow(overrides: Record<string, unknown> = {}) {
  return {
    ...detailWindow(overrides),
    matter: {
      id: 'm1',
      title: 'Matter',
      matterType: MatterType.trademark,
      assignedTo: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
      client: {
        id: 'c1',
        type: 'company',
        internalCode: 'CL-1',
        companyName: 'Acme',
        firstName: null,
        lastName: null,
      },
    },
  };
}

describe('RenewalsService', () => {
  let service: RenewalsService;
  let prisma: {
    ipRight: { findFirst: jest.Mock; update: jest.Mock };
    renewalWindow: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    renewalInstruction: { create: jest.Mock };
    renewalPart: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    renewalPayment: { create: jest.Mock };
    fixedFee: { create: jest.Mock };
    deadline: { updateMany: jest.Mock };
    matterTimelineEvent: { create: jest.Mock };
    user: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let renewalDeadlines: { generateFromWindow: jest.Mock };
  let notifications: { dispatch: jest.Mock };
  let managingPartnerAudience: { listActiveManagingPartners: jest.Mock };
  let invoices: { createAndIssueFromLines: jest.Mock };

  beforeEach(() => {
    prisma = {
      ipRight: { findFirst: jest.fn(), update: jest.fn() },
      renewalWindow: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      renewalInstruction: { create: jest.fn() },
      renewalPart: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      renewalPayment: { create: jest.fn() },
      fixedFee: { create: jest.fn().mockResolvedValue({ id: 'ff1' }) },
      deadline: { updateMany: jest.fn() },
      matterTimelineEvent: { create: jest.fn() },
      user: { findUnique: jest.fn() },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    renewalDeadlines = {
      generateFromWindow: jest.fn().mockResolvedValue([]),
    };
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    managingPartnerAudience = {
      listActiveManagingPartners: jest.fn().mockResolvedValue([]),
    };
    invoices = {
      createAndIssueFromLines: jest.fn().mockResolvedValue({ id: 'inv1' }),
    };

    service = new RenewalsService(
      prisma as unknown as PrismaService,
      renewalDeadlines as unknown as RenewalDeadlinesService,
      notifications as unknown as NotificationDispatchService,
      managingPartnerAudience as unknown as ManagingPartnerAudienceService,
      invoices as unknown as InvoicesService,
    );
  });

  describe('findOne', () => {
    it('throws when window is missing', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns serialized detail', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(detailWindow());
      const result = await service.findOne('rw1');
      expect(result.id).toBe('rw1');
      expect(result.ipRight.title).toBe('Mark');
    });
  });

  describe('listAll / listMy', () => {
    it('paginates worklist items', async () => {
      prisma.renewalWindow.findMany.mockResolvedValue([
        worklistRow({ id: 'rw1' }),
        worklistRow({ id: 'rw2' }),
        worklistRow({ id: 'rw3' }),
      ]);

      const result = await service.listAll({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('rw2');
    });

    it('scopes listMy to assigned attorney', async () => {
      prisma.renewalWindow.findMany.mockResolvedValue([worklistRow()]);
      await service.listMy(
        { userId: 'u1', roles: [], permissions: [] },
        { status: RenewalStatus.upcoming },
      );
      expect(prisma.renewalWindow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: RenewalStatus.upcoming,
            matter: { assignedToId: 'u1' },
          }),
        }),
      );
    });
  });

  describe('listForPortalClient', () => {
    it('returns upcoming and instructed renewals for client', async () => {
      prisma.renewalWindow.findMany.mockResolvedValue([worklistRow()]);
      const result = await service.listForPortalClient('c1');
      expect(result).toHaveLength(1);
      expect(prisma.renewalWindow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId: 'c1',
            status: {
              in: [RenewalStatus.upcoming, RenewalStatus.instructed],
            },
          },
        }),
      );
    });
  });

  describe('findOneForPortal', () => {
    it('throws when renewal is outside client scope', async () => {
      prisma.renewalWindow.findFirst.mockResolvedValue(null);
      await expect(
        service.findOneForPortal('rw1', 'c1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('listForIpRight', () => {
    it('throws when IP right is missing on matter', async () => {
      prisma.ipRight.findFirst.mockResolvedValue(null);
      await expect(service.listForIpRight('m1', 'ipr1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists windows for a valid IP right', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({ id: 'ipr1' });
      prisma.renewalWindow.findMany.mockResolvedValue([detailWindow()]);
      const result = await service.listForIpRight('m1', 'ipr1');
      expect(result).toHaveLength(1);
    });
  });

  describe('createWindow', () => {
    it('throws when IP right is missing', async () => {
      prisma.ipRight.findFirst.mockResolvedValue(null);
      await expect(
        service.createWindow(
          'm1',
          'ipr1',
          { dueDate: new Date(), cycleNumber: 2 },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects duplicate cycle numbers', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        clientId: 'c1',
        jurisdiction: 'EU',
      });
      prisma.renewalWindow.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createWindow(
          'm1',
          'ipr1',
          { dueDate: new Date('2035-01-01'), cycleNumber: 2 },
          'u1',
        ),
      ).rejects.toThrow(/cycle 2 already exists/);
    });

    it('creates a window and generates deadlines', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        clientId: 'c1',
        jurisdiction: 'EU',
      });
      prisma.renewalWindow.findUnique.mockResolvedValue(null);
      prisma.renewalWindow.create.mockResolvedValue({ id: 'rw2' });

      const result = await service.createWindow(
        'm1',
        'ipr1',
        { dueDate: new Date('2035-01-01'), cycleNumber: 2 },
        'u1',
      );

      expect(result.renewalWindow.id).toBe('rw2');
      expect(renewalDeadlines.generateFromWindow).toHaveBeenCalledWith(
        'rw2',
        'u1',
      );
    });
  });

  describe('registerIpRight', () => {
    it('throws when IP right is missing', async () => {
      prisma.ipRight.findFirst.mockResolvedValue(null);
      await expect(
        service.registerIpRight(
          'm1',
          'ipr1',
          { registrationDate: '2026-01-01', registrationNumber: 'R1' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects already registered rights', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.registered,
        renewalWindows: [],
      });
      await expect(
        service.registerIpRight(
          'm1',
          'ipr1',
          { registrationDate: '2026-01-01', registrationNumber: 'R1' },
          'u1',
        ),
      ).rejects.toThrow(/already registered/);
    });

    it('requires filing before registration', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.pending,
        renewalWindows: [],
      });
      await expect(
        service.registerIpRight(
          'm1',
          'ipr1',
          { registrationDate: '2026-01-01', registrationNumber: 'R1' },
          'u1',
        ),
      ).rejects.toThrow(/File the application/);
    });

    it('registers a filed IP right and creates cycle-1 window', async () => {
      prisma.ipRight.findFirst.mockResolvedValue({
        id: 'ipr1',
        clientId: 'c1',
        status: IpRightStatus.filed,
        rightType: MatterType.trademark,
        jurisdiction: 'EU',
        filingDate: null,
        title: 'Mark',
        renewalWindows: [],
      });
      prisma.ipRight.update.mockResolvedValue({
        id: 'ipr1',
        status: IpRightStatus.registered,
        title: 'Mark',
      });
      prisma.renewalWindow.create.mockResolvedValue({
        id: 'rw1',
        status: RenewalStatus.upcoming,
      });

      const result = await service.registerIpRight(
        'm1',
        'ipr1',
        {
          registrationDate: '2020-01-15',
          registrationNumber: 'REG-1',
        },
        'u1',
      );

      expect(prisma.ipRight.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: IpRightStatus.registered,
            registrationNumber: 'REG-1',
          }),
        }),
      );
      expect(prisma.renewalWindow.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cycleNumber: 1,
            status: RenewalStatus.upcoming,
            jurisdiction: 'EU',
          }),
        }),
      );
      expect(renewalDeadlines.generateFromWindow).toHaveBeenCalledWith(
        'rw1',
        'u1',
      );
      expect(result.renewalWindow.id).toBe('rw1');
    });
  });

  describe('instruct', () => {
    it('rejects when window has parts', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        detailWindow({ status: RenewalStatus.upcoming }),
      );
      prisma.renewalPart.count.mockResolvedValue(2);
      await expect(
        service.instruct(
          'rw1',
          { decision: RenewalInstructionDecision.proceed },
          'u1',
        ),
      ).rejects.toThrow(/instruct each part/);
    });

    it('rejects non-upcoming windows', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        detailWindow({ status: RenewalStatus.instructed }),
      );
      await expect(
        service.instruct(
          'rw1',
          { decision: RenewalInstructionDecision.proceed },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks upcoming renewals as instructed', async () => {
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.upcoming }),
        )
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.instructed }),
        );

      const result = await service.instruct(
        'rw1',
        { decision: RenewalInstructionDecision.proceed },
        'u1',
      );

      expect(prisma.renewalInstruction.create).toHaveBeenCalled();
      expect(prisma.renewalWindow.update).toHaveBeenCalledWith({
        where: { id: 'rw1' },
        data: { status: RenewalStatus.instructed },
      });
      expect(result.status).toBe(RenewalStatus.instructed);
    });

    it('lapses on abandon and supersedes deadlines', async () => {
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.upcoming }),
        )
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.lapsed }),
        );

      await service.instruct(
        'rw1',
        { decision: RenewalInstructionDecision.abandon },
        'u1',
      );

      expect(prisma.renewalWindow.update).toHaveBeenCalledWith({
        where: { id: 'rw1' },
        data: { status: RenewalStatus.lapsed },
      });
      expect(prisma.deadline.updateMany).toHaveBeenCalledWith({
        where: {
          sourceRenewalWindowId: 'rw1',
          status: {
            in: [DeadlineStatus.pending, DeadlineStatus.in_progress],
          },
        },
        data: { status: DeadlineStatus.superseded },
      });
    });
  });

  describe('markFiled', () => {
    it('requires instructed status', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        detailWindow({ status: RenewalStatus.upcoming }),
      );
      await expect(service.markFiled('rw1', 'u1')).rejects.toThrow(
        /Only instructed renewals/,
      );
    });

    it('marks instructed renewals as filed', async () => {
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.instructed }),
        )
        .mockResolvedValueOnce(detailWindow({ status: RenewalStatus.filed }));

      const result = await service.markFiled('rw1', 'u1');

      expect(prisma.renewalWindow.update).toHaveBeenCalledWith({
        where: { id: 'rw1' },
        data: { status: RenewalStatus.filed },
      });
      expect(prisma.matterTimelineEvent.create).toHaveBeenCalled();
      expect(result.status).toBe(RenewalStatus.filed);
    });
  });

  describe('complete', () => {
    it('rejects upcoming renewals', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(
        detailWindow({ status: RenewalStatus.upcoming }),
      );
      await expect(service.complete('rw1', {}, 'u1')).rejects.toThrow(
        /Only instructed or filed renewals/,
      );
    });

    it('completes an instructed renewal and auto-invoices fees', async () => {
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.instructed }),
        )
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.completed }),
        );
      prisma.fixedFee.create
        .mockResolvedValueOnce({ id: 'ff-official' })
        .mockResolvedValueOnce({ id: 'ff-service' });
      prisma.renewalWindow.create.mockResolvedValue({ id: 'rw2' });

      const result = await service.complete('rw1', {}, 'u1');

      expect(prisma.fixedFee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: FixedFeeCategory.disbursement,
        }),
      });
      expect(prisma.fixedFee.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          category: FixedFeeCategory.professional_fee,
        }),
      });
      expect(invoices.createAndIssueFromLines).toHaveBeenCalled();
      expect(result.status).toBe(RenewalStatus.completed);
    });
  });

  describe('splitWindow', () => {
    it('requires at least one part', async () => {
      await expect(service.splitWindow('rw1', [], 'u1')).rejects.toThrow(
        /At least one part/,
      );
    });

    it('splits an upcoming window into parts', async () => {
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({
            status: RenewalStatus.upcoming,
            parts: [],
          }),
        )
        .mockResolvedValueOnce(
          detailWindow({
            status: RenewalStatus.upcoming,
            parts: [{ id: 'p1', jurisdiction: 'BG' }],
          }),
        );

      await service.splitWindow(
        'rw1',
        [{ jurisdiction: 'bg', niceClasses: [1, 2] }],
        'u1',
      );

      expect(prisma.renewalPart.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jurisdiction: 'BG',
          niceClasses: [1, 2],
          status: RenewalStatus.upcoming,
        }),
      });
    });
  });

  describe('instructPart', () => {
    it('instructs an upcoming part and rolls up window status', async () => {
      const part = {
        id: 'p1',
        renewalWindowId: 'rw1',
        status: RenewalStatus.upcoming,
        renewalWindow: detailWindow({ status: RenewalStatus.upcoming }),
      };
      prisma.renewalPart.findUnique.mockResolvedValue(part);
      prisma.renewalWindow.findUnique.mockImplementation(() =>
        Promise.resolve(
          detailWindow({
            status: RenewalStatus.instructed,
            parts: [{ id: 'p1', status: RenewalStatus.instructed }],
          }),
        ),
      );

      const result = await service.instructPart(
        'p1',
        { decision: RenewalInstructionDecision.proceed },
        'u1',
      );

      expect(prisma.renewalPart.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: RenewalStatus.instructed },
      });
      expect(result.status).toBe(RenewalStatus.instructed);
    });
  });

  describe('portalInstruct', () => {
    it('notifies assignee and managing partners', async () => {
      const portalWindow = {
        id: 'rw1',
        cycleNumber: 1,
        matterId: 'm1',
        ipRight: { title: 'Mark' },
        matter: { id: 'm1', title: 'Matter', assignedToId: 'u1' },
      };
      prisma.renewalWindow.findFirst.mockResolvedValue(portalWindow);
      prisma.renewalWindow.findUnique
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.upcoming }),
        )
        .mockResolvedValueOnce(
          detailWindow({ status: RenewalStatus.instructed }),
        );
      managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
        { id: 'mp1', email: 'mp@x.com' },
      ]);
      prisma.user.findUnique.mockResolvedValue({ email: 'assignee@x.com' });

      await service.portalInstruct(
        'rw1',
        { decision: RenewalInstructionDecision.proceed },
        { userId: 'pc1', email: 'client@x.com', roles: [], permissions: [] },
        'c1',
      );

      expect(notifications.dispatch).toHaveBeenCalledTimes(2);
      expect(notifications.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          type: 'renewal_instruction_received',
        }),
      );
    });
  });

  describe('listParts', () => {
    it('throws when window is missing', async () => {
      prisma.renewalWindow.findUnique.mockResolvedValue(null);
      await expect(service.listParts('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
