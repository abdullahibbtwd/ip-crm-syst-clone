import { Injectable } from '@nestjs/common';
import { AuditStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAuditLogInput {
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  module?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  status?: AuditStatus;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        userEmail: entry.userEmail ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        module: entry.module ?? null,
        oldValue: entry.oldValue as object | undefined,
        newValue: entry.newValue as object | undefined,
        metadata: entry.metadata as object | undefined,
        status: entry.status ?? AuditStatus.success,
      },
    });
  }

  async query(filters: {
    userId?: string;
    resource?: string;
    module?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = Math.min(filters.limit ?? 50, 100);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId: filters.userId,
        resource: filters.resource,
        module: filters.module,
        createdAt: {
          gte: filters.from ? new Date(filters.from) : undefined,
          lte: filters.to ? new Date(filters.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(filters.cursor
        ? { cursor: { id: filters.cursor }, skip: 1 }
        : {}),
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    });

    const hasMore = logs.length > take;
    const items = hasMore ? logs.slice(0, take) : logs;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id : null,
    };
  }
}
