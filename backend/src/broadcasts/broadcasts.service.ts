import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BroadcastAudience,
  BroadcastRecipientStatus,
  BroadcastStatus,
  ClientStatus,
  MatterStatus,
  MatterType,
  Prisma,
} from '../../generated/prisma/client';
import { clientDisplayName } from '../crm/crm.utils';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import {
  BROADCAST_BACKOFF_MS,
  BROADCAST_EMAIL_QUEUE,
  BROADCAST_FANOUT_JOB,
  BROADCAST_JOB_ATTEMPTS,
  BROADCAST_SEND_JOB,
} from './broadcasts.constants';
import type { CreateBroadcastDto } from './dto/broadcast.dto';

export type AudienceRecipient = {
  clientId: string;
  email: string;
  displayName: string;
};

export type BroadcastSendJobData = {
  broadcastId: string;
  recipientId: string;
};

const contactSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
} as const;

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    @InjectQueue(BROADCAST_EMAIL_QUEUE) private readonly queue: Queue,
  ) {}

  listBroadcasts() {
    return this.prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });
  }

  async getBroadcast(id: string) {
    const row = await this.prisma.broadcast.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        recipients: {
          orderBy: { email: 'asc' },
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
                firstName: true,
                lastName: true,
                internalCode: true,
                type: true,
              },
            },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Broadcast not found');
    return row;
  }

  async previewAudience(
    audience: BroadcastAudience,
    clientIds?: string[],
  ): Promise<{ count: number; recipients: AudienceRecipient[] }> {
    const recipients = await this.resolveAudience(audience, clientIds);
    return { count: recipients.length, recipients };
  }

  async createAndEnqueue(dto: CreateBroadcastDto, userId: string) {
    if (dto.audience === BroadcastAudience.manual) {
      if (!dto.clientIds?.length) {
        throw new BadRequestException(
          'Select at least one client for a manual broadcast',
        );
      }
    }

    const recipients = await this.resolveAudience(dto.audience, dto.clientIds);
    if (recipients.length === 0) {
      throw new BadRequestException('No recipients matched this audience');
    }

    const broadcast = await this.prisma.broadcast.create({
      data: {
        subject: dto.subject.trim(),
        bodyText: dto.bodyText.trim(),
        bodyHtml: dto.bodyHtml?.trim() || null,
        audience: dto.audience,
        audienceFilter:
          dto.audience === BroadcastAudience.manual
            ? ({ clientIds: dto.clientIds } as Prisma.InputJsonValue)
            : undefined,
        status: BroadcastStatus.queued,
        totalRecipients: recipients.length,
        createdById: userId,
        recipients: {
          create: recipients.map((r) => ({
            clientId: r.clientId,
            email: r.email,
            displayName: r.displayName,
            status: BroadcastRecipientStatus.pending,
          })),
        },
      },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.queue.add(
      BROADCAST_FANOUT_JOB,
      { broadcastId: broadcast.id },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: BROADCAST_BACKOFF_MS },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    );

    this.logger.log(
      `Broadcast ${broadcast.id} queued for ${recipients.length} recipient(s)`,
    );

    return {
      ...broadcast,
      recipientPreview: recipients.slice(0, 25),
    };
  }

  async fanOut(broadcastId: string) {
    const broadcast = await this.prisma.broadcast.findUnique({
      where: { id: broadcastId },
      include: {
        recipients: {
          where: { status: BroadcastRecipientStatus.pending },
          select: { id: true },
        },
      },
    });
    if (!broadcast) return;

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: { status: BroadcastStatus.sending },
    });

    for (const recipient of broadcast.recipients) {
      await this.queue.add(
        BROADCAST_SEND_JOB,
        { broadcastId, recipientId: recipient.id } satisfies BroadcastSendJobData,
        {
          attempts: BROADCAST_JOB_ATTEMPTS,
          backoff: { type: 'exponential', delay: BROADCAST_BACKOFF_MS },
          removeOnComplete: 100,
          removeOnFail: 100,
          jobId: `broadcast-${broadcastId}-${recipient.id}`,
        },
      );
    }
  }

  async sendRecipient(data: BroadcastSendJobData) {
    const recipient = await this.prisma.broadcastRecipient.findUnique({
      where: { id: data.recipientId },
      include: { broadcast: true },
    });
    if (!recipient || recipient.broadcastId !== data.broadcastId) {
      return;
    }
    if (recipient.status === BroadcastRecipientStatus.sent) {
      return;
    }

    try {
      await this.email.send({
        to: recipient.email,
        subject: recipient.broadcast.subject,
        text: recipient.broadcast.bodyText,
        html: recipient.broadcast.bodyHtml ?? undefined,
      });

      await this.prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: BroadcastRecipientStatus.sent,
          sentAt: new Date(),
          error: null,
        },
      });
      await this.prisma.broadcast.update({
        where: { id: data.broadcastId },
        data: { sentCount: { increment: 1 } },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: BroadcastRecipientStatus.failed,
          error: message.slice(0, 1000),
        },
      });
      await this.prisma.broadcast.update({
        where: { id: data.broadcastId },
        data: { failedCount: { increment: 1 } },
      });
      throw err;
    } finally {
      await this.maybeCompleteBroadcast(data.broadcastId);
    }
  }

  private async maybeCompleteBroadcast(broadcastId: string) {
    const [pending, failed, total] = await Promise.all([
      this.prisma.broadcastRecipient.count({
        where: { broadcastId, status: BroadcastRecipientStatus.pending },
      }),
      this.prisma.broadcastRecipient.count({
        where: { broadcastId, status: BroadcastRecipientStatus.failed },
      }),
      this.prisma.broadcastRecipient.count({ where: { broadcastId } }),
    ]);
    if (pending > 0) return;

    await this.prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        status:
          failed > 0 && failed === total
            ? BroadcastStatus.failed
            : BroadcastStatus.completed,
        completedAt: new Date(),
      },
    });
  }

  private async resolveAudience(
    audience: BroadcastAudience,
    clientIds?: string[],
  ): Promise<AudienceRecipient[]> {
    switch (audience) {
      case BroadcastAudience.active_clients:
        return this.recipientsFromClients({ status: ClientStatus.active });
      case BroadcastAudience.pending_eu_renewals:
        return this.recipientsFromPendingEuRenewals();
      case BroadcastAudience.trademark_matters:
        return this.recipientsFromTrademarkMatters();
      case BroadcastAudience.manual:
        return this.recipientsFromClients({
          id: { in: clientIds ?? [] },
          status: { not: ClientStatus.archived },
        });
      default:
        return [];
    }
  }

  private async recipientsFromPendingEuRenewals(): Promise<AudienceRecipient[]> {
    const windows = await this.prisma.renewalWindow.findMany({
      where: {
        status: { in: ['upcoming', 'instructed', 'filed'] },
        OR: [
          { jurisdiction: { equals: 'EU', mode: 'insensitive' } },
          { jurisdiction: { equals: 'EUTM', mode: 'insensitive' } },
        ],
        client: { status: ClientStatus.active },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    const ids = windows.map((w) => w.clientId);
    if (ids.length === 0) return [];
    return this.recipientsFromClients({ id: { in: ids } });
  }

  private async recipientsFromTrademarkMatters(): Promise<AudienceRecipient[]> {
    const matters = await this.prisma.matter.findMany({
      where: {
        matterType: MatterType.trademark,
        status: MatterStatus.active,
        client: { status: ClientStatus.active },
      },
      select: { clientId: true },
      distinct: ['clientId'],
    });
    const ids = matters.map((m) => m.clientId);
    if (ids.length === 0) return [];
    return this.recipientsFromClients({ id: { in: ids } });
  }

  private async recipientsFromClients(
    where: Prisma.ClientWhereInput,
  ): Promise<AudienceRecipient[]> {
    const clients = await this.prisma.client.findMany({
      where,
      select: {
        id: true,
        type: true,
        companyName: true,
        firstName: true,
        lastName: true,
        contacts: {
          where: {
            isActive: true,
            email: { not: null },
          },
          select: contactSelect,
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    const byEmail = new Map<string, AudienceRecipient>();
    for (const client of clients) {
      const contact =
        client.contacts.find((c) => c.role === 'primary' && c.email) ??
        client.contacts.find((c) => c.email);
      if (!contact?.email) continue;
      const email = contact.email.trim().toLowerCase();
      if (!email || byEmail.has(email)) continue;
      byEmail.set(email, {
        clientId: client.id,
        email,
        displayName: clientDisplayName(client),
      });
    }
    return [...byEmail.values()].sort((a, b) =>
      a.displayName.localeCompare(b.displayName),
    );
  }
}
