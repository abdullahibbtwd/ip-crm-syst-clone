import { Injectable } from '@nestjs/common';
import { RelationshipEventType } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { parseLimit } from '../dto/pagination.dto';

export interface LogRelationshipEventInput {
  clientId: string;
  userId?: string | null;
  eventType: RelationshipEventType;
  description?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogRelationshipEventInput) {
    return this.prisma.relationshipHistory.create({
      data: {
        clientId: input.clientId,
        userId: input.userId ?? null,
        eventType: input.eventType,
        description: input.description ?? null,
        metadata: input.metadata as object | undefined,
      },
    });
  }

  async findByClient(
    clientId: string,
    filters: { cursor?: string; limit?: number },
  ) {
    const take = parseLimit(filters.limit, 25);

    const rows = await this.prisma.relationshipHistory.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(filters.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : {}),
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }
}
