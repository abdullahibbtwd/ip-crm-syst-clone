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
    matter: { findUnique: jest.Mock };
    matterDocumentVersion: { findFirst: jest.Mock };
    clientApprovalRequest: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };
  let notifications: { dispatch: jest.Mock };
  let managingPartnerAudience: { listActiveManagingPartners: jest.Mock };

  beforeEach(() => {
    prisma = {
      matter: { findUnique: jest.fn() },
      matterDocumentVersion: { findFirst: jest.fn() },
      clientApprovalRequest: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
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

  describe('listForMatter', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(service.listForMatter('m1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns approvals for matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1' });
      prisma.clientApprovalRequest.findMany.mockResolvedValue([approvalRow()]);

      await expect(service.listForMatter('m1')).resolves.toHaveLength(1);
    });
  });

  describe('create', () => {
    it('throws when matter is missing', async () => {
      prisma.matter.findUnique.mockResolvedValue(null);
      await expect(
        service.create('m1', { title: 'Approve' } as never, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects document version not on matter', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
      });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          'm1',
          { title: 'Approve', documentVersionId: 'dv1' } as never,
          'u1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates draft approval', async () => {
      prisma.matter.findUnique.mockResolvedValue({
        id: 'm1',
        clientId: 'c1',
      });
      prisma.clientApprovalRequest.create.mockResolvedValue(approvalRow());

      const result = await service.create(
        'm1',
        { title: ' Approve renewal ' } as never,
        'u1',
      );

      expect(result.title).toBe('Approve renewal');
      expect(prisma.clientApprovalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ClientApprovalStatus.draft,
            requestedById: 'u1',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws when approval is missing', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { title: 'x' } as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects non-draft approvals', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );
      await expect(
        service.update('ap1', { title: 'x' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates draft approval', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(approvalRow());
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ title: 'Updated' }),
      );

      const result = await service.update('ap1', { title: 'Updated' } as never);
      expect(result.title).toBe('Updated');
    });
  });

  describe('submit', () => {
    it('throws when approval is missing', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(null);
      await expect(service.submit('missing', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

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

  describe('listForPortalClient', () => {
    it('returns non-draft approvals for client', async () => {
      prisma.clientApprovalRequest.findMany.mockResolvedValue([
        approvalRow({ status: ClientApprovalStatus.pending }),
      ]);

      await expect(service.listForPortalClient('c1')).resolves.toHaveLength(1);
      expect(prisma.clientApprovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clientId: 'c1',
            status: { not: ClientApprovalStatus.draft },
          }),
        }),
      );
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

    it('rejects a pending request', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.rejected }),
      );

      const result = await service.decide('ap1', 'c1', 'u1', {
        decision: 'rejected',
        note: ' Not now ',
      });

      expect(result.status).toBe(ClientApprovalStatus.rejected);
    });
  });

  describe('assertOnMatter', () => {
    it('throws when approval is not on matter', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(null);
      await expect(
        service.assertOnMatter('ap1', 'm1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('passes when approval belongs to matter', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue({ id: 'ap1' });
      await expect(
        service.assertOnMatter('ap1', 'm1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('extended branch coverage', () => {
    it('create stores optional note and document version', async () => {
      prisma.matter.findUnique.mockResolvedValue({ id: 'm1', clientId: 'c1' });
      prisma.matterDocumentVersion.findFirst.mockResolvedValue({ id: 'dv1' });
      prisma.clientApprovalRequest.create.mockResolvedValue(
        approvalRow({ documentVersionId: 'dv1', note: 'Please review' }),
      );

      await service.create(
        'm1',
        { title: 'Sign POA', documentVersionId: 'dv1', description: 'Please review' },
        'u1',
      );

      expect(prisma.clientApprovalRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentVersionId: 'dv1',
            description: 'Please review',
          }),
        }),
      );
    });

    it('update clears description when empty string provided', async () => {
      prisma.clientApprovalRequest.findUnique.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.draft }),
      );
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ description: null }),
      );

      await service.update('ap1', { description: '   ' });
      expect(prisma.clientApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('decide stores trimmed rejection note', async () => {
      prisma.clientApprovalRequest.findFirst.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.pending }),
      );
      prisma.clientApprovalRequest.update.mockResolvedValue(
        approvalRow({ status: ClientApprovalStatus.rejected, note: 'No' }),
      );

      await service.decide('ap1', 'c1', 'u1', {
        decision: 'rejected',
        note: '  No  ',
      });

      expect(prisma.clientApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ decisionNote: 'No' }),
        }),
      );
    });

    it('listForPortalClient returns empty array when none pending', async () => {
      prisma.clientApprovalRequest.findMany.mockResolvedValue([]);
      await expect(service.listForPortalClient('c1')).resolves.toEqual([]);
    });
  });
});
