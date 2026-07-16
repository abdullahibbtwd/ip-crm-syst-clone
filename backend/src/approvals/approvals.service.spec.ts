import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClientApprovalStatus } from '../../generated/prisma/client';
import type { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import type { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsService } from './approvals.service';

function approvalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ap1',
    clientId: 'c1',
    matterId: 'm1',
    title: 'Approve renewal',
    status: ClientApprovalStatus.draft,
    matter: { title: 'Matter', assignedToId: null },
    ...overrides,
  };
}

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let prisma: {
    clientApprovalRequest: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let notifications: { dispatch: jest.Mock };
  let managingPartnerAudience: { listActiveManagingPartners: jest.Mock };

  beforeEach(() => {
    prisma = {
      clientApprovalRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    notifications = { dispatch: jest.fn().mockResolvedValue(undefined) };
    managingPartnerAudience = {
      listActiveManagingPartners: jest.fn().mockResolvedValue([]),
    };
    service = new ApprovalsService(
      prisma as unknown as PrismaService,
      notifications as unknown as NotificationDispatchService,
      managingPartnerAudience as unknown as ManagingPartnerAudienceService,
    );
  });

  describe('submit', () => {
    it('rejects non-draft approvals', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );
      await expect(service.submit('ap1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('moves draft to pending', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(approvalRow());
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );

      const result = await service.submit('ap1', 'u1');

      expect(prisma.clientApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ClientApprovalStatus.pending,
            requestedById: 'u1',
          }),
        }),
      );
      expect(result.status).toBe(ClientApprovalStatus.pending);
    });
  });

  describe('decide', () => {
    it('throws when approval is missing for client', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.decide('ap1', 'c1', 'u1', { decision: 'approved' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-pending decisions', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.draft }),
      );
      await expect(
        service.decide('ap1', 'c1', 'u1', { decision: 'approved' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('approves a pending request', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.approved }),
      );

      const result = await service.decide('ap1', 'c1', 'u1', {
        decision: 'approved',
      });

      expect(result.status).toBe(ClientApprovalStatus.approved);
      expect(prisma.clientApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ClientApprovalStatus.approved,
            decidedById: 'u1',
          }),
        }),
      );
    });
  });
});
