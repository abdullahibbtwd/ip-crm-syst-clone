import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CorrespondenceStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortalMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForClient(clientId: string) {
    const [broadcasts, correspondence, unreadCount] = await Promise.all([
      this.prisma.portalBroadcastCopy.findMany({
        where: { clientId },
        orderBy: { sentAt: 'desc' },
        take: 200,
      }),
      this.prisma.correspondence.findMany({
        where: {
          isClientVisible: true,
          status: { not: CorrespondenceStatus.draft },
          matter: { clientId },
        },
        orderBy: [{ correspondenceDate: 'desc' }, { createdAt: 'desc' }],
        take: 200,
        include: {
          matter: {
            select: { id: true, title: true, matterType: true, status: true },
          },
          documentVersion: {
            select: {
              id: true,
              version: true,
              fileName: true,
              document: { select: { id: true, displayName: true } },
            },
          },
        },
      }),
      this.countUnread(clientId),
    ]);

    const items = [
      ...broadcasts.map((row) => ({
        id: `broadcast:${row.id}`,
        kind: 'broadcast' as const,
        subject: row.subject,
        bodyText: row.bodyText,
        bodyHtml: row.bodyHtml,
        date: row.sentAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        matter: null,
        direction: 'incoming' as const,
        sourceId: row.id,
        broadcastId: row.broadcastId,
        correspondenceId: null as string | null,
        documentVersion: null,
      })),
      ...correspondence.map((row) => ({
        id: `correspondence:${row.id}`,
        kind: 'correspondence' as const,
        subject: row.subject,
        bodyText: row.bodyText,
        bodyHtml: null as string | null,
        date: row.correspondenceDate.toISOString(),
        readAt: row.portalReadAt?.toISOString() ?? null,
        matter: row.matter,
        direction: row.direction,
        sourceId: row.id,
        broadcastId: null as string | null,
        correspondenceId: row.id,
        documentVersion: row.documentVersion,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return { items, total: items.length, unreadCount };
  }

  async countUnread(clientId: string) {
    const [broadcastUnread, correspondenceUnread] = await Promise.all([
      this.prisma.portalBroadcastCopy.count({
        where: { clientId, readAt: null },
      }),
      this.prisma.correspondence.count({
        where: {
          isClientVisible: true,
          portalReadAt: null,
          status: { not: CorrespondenceStatus.draft },
          matter: { clientId },
        },
      }),
    ]);
    return broadcastUnread + correspondenceUnread;
  }

  async findOneForClient(clientId: string, messageId: string) {
    const [kind, rawId] = messageId.includes(':')
      ? (messageId.split(':', 2) as [string, string])
      : ['', messageId];

    if (kind === 'broadcast' || (!kind && rawId)) {
      const id = kind === 'broadcast' ? rawId : messageId;
      const row = await this.prisma.portalBroadcastCopy.findFirst({
        where: { id, clientId },
      });
      if (row) {
        const readAt = row.readAt ?? new Date();
        if (!row.readAt) {
          await this.prisma.portalBroadcastCopy.update({
            where: { id: row.id },
            data: { readAt },
          });
        }
        return {
          id: `broadcast:${row.id}`,
          kind: 'broadcast' as const,
          subject: row.subject,
          bodyText: row.bodyText,
          bodyHtml: row.bodyHtml,
          date: row.sentAt.toISOString(),
          readAt: readAt.toISOString(),
          matter: null,
          direction: 'incoming' as const,
          sourceId: row.id,
          broadcastId: row.broadcastId,
          correspondenceId: null,
          documentVersion: null,
        };
      }
      if (kind === 'broadcast') {
        throw new NotFoundException('Message not found');
      }
    }

    if (kind === 'correspondence' || kind === '') {
      const id = kind === 'correspondence' ? rawId : messageId;
      const row = await this.prisma.correspondence.findFirst({
        where: {
          id,
          isClientVisible: true,
          status: { not: CorrespondenceStatus.draft },
          matter: { clientId },
        },
        include: {
          matter: {
            select: { id: true, title: true, matterType: true, status: true },
          },
          documentVersion: {
            select: {
              id: true,
              version: true,
              fileName: true,
              document: { select: { id: true, displayName: true } },
            },
          },
        },
      });
      if (!row) throw new NotFoundException('Message not found');

      const readAt = row.portalReadAt ?? new Date();
      if (!row.portalReadAt) {
        await this.prisma.correspondence.update({
          where: { id: row.id },
          data: { portalReadAt: readAt },
        });
      }

      return {
        id: `correspondence:${row.id}`,
        kind: 'correspondence' as const,
        subject: row.subject,
        bodyText: row.bodyText,
        bodyHtml: null,
        date: row.correspondenceDate.toISOString(),
        readAt: readAt.toISOString(),
        matter: row.matter,
        direction: row.direction,
        sourceId: row.id,
        broadcastId: null,
        correspondenceId: row.id,
        documentVersion: row.documentVersion,
      };
    }

    throw new NotFoundException('Message not found');
  }
}
