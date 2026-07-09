import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditStatus, Prisma } from '../../generated/prisma/client';
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

const DATA_ACCESS_ACTIONS = [
  'client.read',
  'client.access_history',
  'contact.read',
  'document.download',
  'intake.read',
  'personal_data_export',
] as const;

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
    action?: string;
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
        action: filters.action,
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

  async queryDataAccess(
    clientId: string,
    filters: { cursor?: string; limit?: number },
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    const take = Math.min(filters.limit ?? 50, 100);
    const clientIdFilter = clientId;

    const logs = await this.prisma.auditLog.findMany({
      where: {
        action: { in: [...DATA_ACCESS_ACTIONS] },
        OR: [
          { resource: 'client', resourceId: clientIdFilter },
          {
            metadata: {
              path: ['clientId'],
              equals: clientIdFilter,
            },
          },
        ],
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

  async queryPersonalDataExports(filters: {
    clientId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = Math.min(filters.limit ?? 50, 100);

    const where: Prisma.AuditLogWhereInput = {
      action: 'personal_data_export',
    };

    if (filters.clientId) {
      where.OR = [
        { resource: 'client', resourceId: filters.clientId },
        {
          metadata: {
            path: ['clientId'],
            equals: filters.clientId,
          },
        },
      ];
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
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
