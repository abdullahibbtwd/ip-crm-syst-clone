import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ClientApprovalStatus,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ManagingPartnerAudienceService } from '../notifications/managing-partner-audience.service';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import {
  CreateApprovalDto,
  DecideApprovalDto,
  UpdateApprovalDto,
} from './dto/approval.dto';

const approvalInclude = {
  requestedBy: {
    select: { id: true, fullName: true, email: true },
  },
  decidedBy: {
    select: { id: true, fullName: true, email: true },
  },
  documentVersion: {
    select: { id: true, version: true, fileName: true },
  },
  matter: {
    select: {
      id: true,
      title: true,
      assignedToId: true,
      assignedTo: { select: { id: true, email: true, fullName: true } },
    },
  },
  client: {
    select: { id: true, companyName: true, firstName: true, lastName: true },
  },
} satisfies Prisma.ClientApprovalRequestInclude;

type ApprovalRow = Prisma.ClientApprovalRequestGetPayload<{
  include: typeof approvalInclude;
}>;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationDispatchService,
    private readonly managingPartnerAudience: ManagingPartnerAudienceService,
  ) {}

  async listForMatter(matterId: string) {
    await this.assertMatterExists(matterId);
    return this.prisma.clientApprovalRequest.findMany({
      where: { matterId },
      orderBy: [{ createdAt: 'desc' }],
      include: approvalInclude,
    });
  }

  async create(matterId: string, dto: CreateApprovalDto, userId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true, clientId: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');

    if (dto.documentVersionId) {
      await this.assertDocumentVersionOnMatter(
        matterId,
        dto.documentVersionId,
      );
    }

    return this.prisma.clientApprovalRequest.create({
      data: {
        matterId,
        clientId: matter.clientId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        documentVersionId: dto.documentVersionId ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        requestedById: userId,
        status: ClientApprovalStatus.draft,
      },
      include: approvalInclude,
    });
  }

  async update(id: string, dto: UpdateApprovalDto) {
    const row = await this.getOrThrow(id);
    if (row.status !== ClientApprovalStatus.draft) {
      throw new BadRequestException('Only draft approvals can be edited');
    }

    if (dto.documentVersionId) {
      await this.assertDocumentVersionOnMatter(
        row.matterId,
        dto.documentVersionId,
      );
    }

    return this.prisma.clientApprovalRequest.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        documentVersionId:
          dto.documentVersionId === undefined
            ? undefined
            : dto.documentVersionId,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate
              ? new Date(dto.dueDate)
              : null,
      },
      include: approvalInclude,
    });
  }

  async submit(id: string, userId: string) {
    const row = await this.getOrThrow(id);
    if (row.status !== ClientApprovalStatus.draft) {
      throw new BadRequestException('Only draft approvals can be submitted');
    }

    const updated = await this.prisma.clientApprovalRequest.update({
      where: { id },
      data: {
        status: ClientApprovalStatus.pending,
        requestedAt: new Date(),
        requestedById: userId,
      },
      include: approvalInclude,
    });

    await this.notifyPortalUsersOnSubmit(updated);
    return updated;
  }

  async listForPortalClient(clientId: string) {
    return this.prisma.clientApprovalRequest.findMany({
      where: {
        clientId,
        status: { not: ClientApprovalStatus.draft },
      },
      orderBy: [{ requestedAt: 'desc' }, { createdAt: 'desc' }],
      include: approvalInclude,
    });
  }

  async decide(
    id: string,
    clientId: string,
    userId: string,
    dto: DecideApprovalDto,
  ) {
    const row = await this.prisma.clientApprovalRequest.findFirst({
      where: { id, clientId },
      include: approvalInclude,
    });
    if (!row) throw new NotFoundException('Approval request not found');
    if (row.status !== ClientApprovalStatus.pending) {
      throw new BadRequestException(
        'Only pending approvals can be decided',
      );
    }

    const status =
      dto.decision === 'approved'
        ? ClientApprovalStatus.approved
        : ClientApprovalStatus.rejected;

    const updated = await this.prisma.clientApprovalRequest.update({
      where: { id },
      data: {
        status,
        decidedAt: new Date(),
        decidedById: userId,
        decisionNote: dto.note?.trim() || null,
      },
      include: approvalInclude,
    });

    await this.notifyStaffOnDecision(updated);
    return updated;
  }

  /** Ensure the approval belongs to the matter (staff route IDOR guard). */
  async assertOnMatter(id: string, matterId: string) {
    const row = await this.prisma.clientApprovalRequest.findFirst({
      where: { id, matterId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Approval request not found');
  }

  private async notifyPortalUsersOnSubmit(row: ApprovalRow) {
    const portalUsers = await this.prisma.user.findMany({
      where: { clientId: row.clientId, isActive: true },
      select: { id: true, email: true },
    });

    const title = `Approval requested: ${row.title}`;
    const body = `Please review and decide on "${row.title}" for matter "${row.matter.title}".`;
    const linkUrl = '/portal/approvals';

    for (const user of portalUsers) {
      await this.notifications.dispatch({
        userId: user.id,
        type: 'client_approval_update',
        title,
        body,
        resource: 'approval',
        resourceId: row.id,
        linkUrl,
        emailTo: user.email,
        metadata: {
          matterId: row.matterId,
          approvalId: row.id,
          status: ClientApprovalStatus.pending,
          audience: 'portal_client',
        },
      });
    }
  }

  private async notifyStaffOnDecision(row: ApprovalRow) {
    const decisionLabel =
      row.status === ClientApprovalStatus.approved ? 'approved' : 'rejected';
    const title = `Client approval ${decisionLabel}: ${row.title}`;
    const body = `Client ${decisionLabel} "${row.title}" on matter "${row.matter.title}".`;
    const linkUrl = `/matters/${row.matterId}/approvals`;

    const recipientIds = new Set<string>();
    if (row.matter.assignedToId) {
      recipientIds.add(row.matter.assignedToId);
    }

    const partners =
      await this.managingPartnerAudience.listActiveManagingPartners();
    for (const partner of partners) {
      recipientIds.add(partner.id);
    }

    for (const userId of recipientIds) {
      const mp = partners.find((p) => p.id === userId);
      const email =
        userId === row.matter.assignedToId
          ? row.matter.assignedTo?.email
          : mp?.email;

      await this.notifications.dispatch({
        userId,
        type: 'client_approval_update',
        title,
        body,
        resource: 'approval',
        resourceId: row.id,
        linkUrl,
        emailTo: email ?? undefined,
        metadata: {
          matterId: row.matterId,
          approvalId: row.id,
          status: row.status,
          audience:
            userId === row.matter.assignedToId
              ? 'assignee'
              : 'managing_partner',
        },
      });
    }
  }

  private async getOrThrow(id: string) {
    const row = await this.prisma.clientApprovalRequest.findUnique({
      where: { id },
      include: approvalInclude,
    });
    if (!row) throw new NotFoundException('Approval request not found');
    return row;
  }

  private async assertMatterExists(matterId: string) {
    const matter = await this.prisma.matter.findUnique({
      where: { id: matterId },
      select: { id: true },
    });
    if (!matter) throw new NotFoundException('Matter not found');
  }

  private async assertDocumentVersionOnMatter(
    matterId: string,
    documentVersionId: string,
  ) {
    const version = await this.prisma.matterDocumentVersion.findFirst({
      where: {
        id: documentVersionId,
        document: { matterId },
      },
      select: { id: true },
    });
    if (!version) {
      throw new BadRequestException(
        'Document version not found on this matter',
      );
    }
  }
}
