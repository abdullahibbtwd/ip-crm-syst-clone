import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PartnerInstructionStatus } from '../../generated/prisma/client';
import type { EmailService } from '../notifications/email.service';
import type { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { PartnerInstructionsService } from './partner-instructions.service';

const instructionRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'i1',
  matterId: 'm1',
  partnerId: 'p1',
  title: 'File opposition',
  body: 'Please file',
  status: PartnerInstructionStatus.draft,
  deadlineId: null,
  createdById: 'u1',
  sentAt: null,
  acknowledgedAt: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  partner: {
    id: 'p1',
    name: 'Local Agent',
    email: 'agent@example.com',
    isActive: true,
  },
  deadline: null,
  createdBy: { id: 'u1', fullName: 'Ada', email: 'a@x.com' },
  matter: {
    id: 'm1',
    title: 'Matter A',
    assignedToId: 'u2',
    assignedTo: { id: 'u2', email: 'b@x.com', fullName: 'Bob' },
  },
  ...overrides,
});

describe('PartnerInstructionsService', () => {
  let service: PartnerInstructionsService;
  let prisma: {
    matter: { findUnique: jest.Mock };
    partner: { findUnique: jest.Mock };
    deadline: { findFirst: jest.Mock };
    partnerInstruction: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let notifications: { dispatch: jest.Mock };
  let managingPartnerAudience: { listActiveManagingPartners: jest.Mock };
  let email: { send: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      partner: { findUnique: jest.fn() },
      deadline: { findFirst: jest.fn() },
      partnerInstruction: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    managingPartnerAudience = {
      listActiveManagingPartners: jest.fn().mockResolvedValue([]),
    };
    email = { send: jest.fn().mockResolvedValue(undefined) };

    service = new PartnerInstructionsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationDispatchService,
      managingPartnerAudience as unknown as ManagingPartnerAudienceService,
      email as unknown as EmailService,
    );
  });

  describe('listForMatter', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listForMatter('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists instructions with optional status filter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.partnerInstruction.findMany.mockResolvedValue([instructionRow()]);

      await service.listForMatter('m1', {
        status: PartnerInstructionStatus.draft,
      });

      expect(prisma.partnerInstruction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            matterId: 'm1',
            status: PartnerInstructionStatus.draft,
          },
        }),
      );
    });
  });

  describe('create', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.create('missing', { partnerId: 'p1', title: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when partner is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.partner.findUnique.mockResolvedValue(null);
      await expect(
        service.create('m1', { partnerId: 'p1', title: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects inactive partner', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'p1',
        isActive: false,
      });
      await expect(
        service.create('m1', { partnerId: 'p1', title: 'x' }, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects deadline not on matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'p1',
        isActive: true,
      });
      prisma.deadline.findFirst.mockResolvedValue(null);
      await expect(
        service.create(
          'm1',
          { partnerId: 'p1', title: 'x', deadlineId: 'd1' },
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates draft instruction', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'p1',
        isActive: true,
      });
      prisma.partnerInstruction.create.mockResolvedValue(instructionRow());

      const result = await service.create(
        'm1',
        { partnerId: 'p1', title: ' File ', body: ' body ' },
        'u1',
      );

      expect(result.title).toBe('File opposition');
      expect(prisma.partnerInstruction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'File',
            body: 'body',
            status: PartnerInstructionStatus.draft,
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws when instruction is missing', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(null);
      await expect(
        service.update('m1', 'missing', { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects editing non-draft instructions', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(
        instructionRow({ status: PartnerInstructionStatus.sent }),
      );
      await expect(
        service.update('m1', 'i1', { title: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates draft instruction', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(instructionRow());
      prisma.partnerInstruction.update.mockResolvedValue(
        instructionRow({ title: 'Updated' }),
      );

      const result = await service.update('m1', 'i1', { title: ' Updated ' });
      expect(result.title).toBe('Updated');
    });
  });

  describe('transition', () => {
    it('throws when instruction is missing', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(null);
      await expect(
        service.transition('m1', 'missing', PartnerInstructionStatus.sent),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects invalid status transition', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(instructionRow());
      await expect(
        service.transition('m1', 'i1', PartnerInstructionStatus.complete),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('transitions draft to sent and notifies', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(instructionRow());
      const sent = instructionRow({
        status: PartnerInstructionStatus.sent,
        sentAt: new Date(),
      });
      prisma.partnerInstruction.update.mockResolvedValue(sent);
      managingPartnerAudience.listActiveManagingPartners.mockResolvedValue([
        { id: 'mp1', email: 'mp@x.com' },
      ]);

      const result = await service.transition(
        'm1',
        'i1',
        PartnerInstructionStatus.sent,
      );

      expect(result.status).toBe(PartnerInstructionStatus.sent);
      expect(notifications.dispatch).toHaveBeenCalled();
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'agent@example.com' }),
      );
    });

    it('transitions sent to acknowledged', async () => {
      prisma.partnerInstruction.findFirst.mockResolvedValue(
        instructionRow({ status: PartnerInstructionStatus.sent }),
      );
      prisma.partnerInstruction.update.mockResolvedValue(
        instructionRow({
          status: PartnerInstructionStatus.acknowledged,
          acknowledgedAt: new Date(),
        }),
      );

      const result = await service.transition(
        'm1',
        'i1',
        PartnerInstructionStatus.acknowledged,
      );

      expect(result.status).toBe(PartnerInstructionStatus.acknowledged);
      expect(notifications.dispatch).not.toHaveBeenCalled();
    });
  });
});
