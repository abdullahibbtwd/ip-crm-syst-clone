import { NotFoundException } from '@nestjs/common';
import { AuditStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: jest.Mock; findMany: jest.Mock };
    client: { findUnique: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      auditLog: { create: jest.fn(), findMany: jest.fn() },
      client: { findUnique: jest.fn() },
    };
    service = new AuditService(prisma as unknown as PrismaService);
  });

  describe('log', () => {
    it('creates an audit log with defaults', async () => {
      const created = { id: 'log1' };
      prisma.auditLog.create.mockResolvedValue(created);

      const result = await service.log({
        action: 'client.read',
        resource: 'client',
        resourceId: 'c1',
        userId: 'u1',
        userEmail: 'a@x.com',
        oldValue: { name: 'Old' },
        newValue: { name: 'New' },
        metadata: { clientId: 'c1' },
      });

      expect(result).toBe(created);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'client.read',
          resource: 'client',
          resourceId: 'c1',
          userId: 'u1',
          userEmail: 'a@x.com',
          status: AuditStatus.success,
          oldValue: { name: 'Old' },
          newValue: { name: 'New' },
          metadata: { clientId: 'c1' },
        }),
      });
    });

    it('nulls optional fields and honors custom status', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log2' });

      await service.log({
        action: 'document.download',
        resource: 'document',
        status: AuditStatus.failure,
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          userEmail: null,
          ipAddress: null,
          userAgent: null,
          resourceId: null,
          module: null,
          status: AuditStatus.failure,
        }),
      });
    });
  });

  describe('query', () => {
    it('returns items without cursor when no more pages', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

      const result = await service.query({ userId: 'u1', limit: 50 });

      expect(result).toEqual({
        items: [{ id: 'a' }, { id: 'b' }],
        nextCursor: null,
      });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u1' }),
          take: 51,
        }),
      );
    });

    it('caps limit at 100 and exposes nextCursor', async () => {
      const rows = Array.from({ length: 101 }, (_, i) => ({ id: `id-${i}` }));
      prisma.auditLog.findMany.mockResolvedValue(rows);

      const result = await service.query({ limit: 500, cursor: 'prev' });

      expect(result.items).toHaveLength(100);
      expect(result.nextCursor).toBe('id-99');
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 101,
          cursor: { id: 'prev' },
          skip: 1,
        }),
      );
    });

    it('applies date range filters', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.query({
        from: '2026-01-01',
        to: '2026-01-31',
        resource: 'client',
        module: 'crm',
        action: 'client.read',
      });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            resource: 'client',
            module: 'crm',
            action: 'client.read',
            createdAt: {
              gte: new Date('2026-01-01'),
              lte: new Date('2026-01-31'),
            },
          }),
        }),
      );
    });
  });

  describe('queryDataAccess', () => {
    it('throws when client is missing', async () => {
      prisma.client.findUnique.mockResolvedValue(null);
      await expect(service.queryDataAccess('missing', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('queries data-access actions for a client', async () => {
      prisma.client.findUnique.mockResolvedValue({ id: 'c1' });
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log1' }]);

      const result = await service.queryDataAccess('c1', { limit: 10 });

      expect(result.items).toHaveLength(1);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: { in: expect.arrayContaining(['client.read', 'personal_data_export']) },
            OR: [
              { resource: 'client', resourceId: 'c1' },
              { metadata: { path: ['clientId'], equals: 'c1' } },
            ],
          }),
          take: 11,
        }),
      );
    });
  });

  describe('queryPersonalDataExports', () => {
    it('filters by clientId when provided', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      await service.queryPersonalDataExports({ clientId: 'c1', cursor: 'cur' });

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: 'personal_data_export',
            OR: [
              { resource: 'client', resourceId: 'c1' },
              { metadata: { path: ['clientId'], equals: 'c1' } },
            ],
          },
          cursor: { id: 'cur' },
          skip: 1,
        }),
      );
    });

    it('returns all personal_data_export logs without client filter', async () => {
      const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      prisma.auditLog.findMany.mockResolvedValue(rows);

      const result = await service.queryPersonalDataExports({ limit: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('b');
    });
  });
});
