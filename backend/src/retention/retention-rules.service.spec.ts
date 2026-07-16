import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  RetentionAction,
  RetentionRule,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RetentionRulesService } from './retention-rules.service';

function ruleRow(overrides: Partial<RetentionRule> = {}): RetentionRule {
  return {
    id: 'r1',
    entityType: 'intake_leads',
    conditionJson: {},
    retentionDays: 365,
    action: RetentionAction.anonymize,
    description: 'Stale leads',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RetentionRulesService', () => {
  let service: RetentionRulesService;
  let prisma: {
    retentionRule: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    intakeLead: { count: jest.Mock };
    auditLog: { count: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      retentionRule: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      intakeLead: { count: jest.fn().mockResolvedValue(0) },
      auditLog: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new RetentionRulesService(prisma as unknown as PrismaService);
  });

  describe('list', () => {
    it('returns rules ordered by entity type and retention days', async () => {
      prisma.retentionRule.findMany.mockResolvedValue([ruleRow()]);
      const result = await service.list();
      expect(prisma.retentionRule.findMany).toHaveBeenCalledWith({
        orderBy: [{ entityType: 'asc' }, { retentionDays: 'asc' }],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('throws when rule is missing', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns the rule when found', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(ruleRow());
      const result = await service.findById('r1');
      expect(result.id).toBe('r1');
    });
  });

  describe('create', () => {
    it('rejects unsupported entity types', () => {
      expect(() =>
        service.create({
          entityType: 'unknown' as never,
          retentionDays: 30,
          action: RetentionAction.delete,
        }),
      ).toThrow(BadRequestException);
    });

    it('requires delete action for audit logs', () => {
      expect(() =>
        service.create({
          entityType: 'audit_logs',
          retentionDays: 90,
          action: RetentionAction.anonymize,
        }),
      ).toThrow(/Audit log retention only supports the delete action/);
    });

    it('creates an active rule', async () => {
      prisma.retentionRule.create.mockResolvedValue(ruleRow());
      const dto = {
        entityType: 'intake_leads' as const,
        retentionDays: 180,
        action: RetentionAction.anonymize,
        description: '  Old leads  ',
      };

      await service.create(dto);

      expect(prisma.retentionRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'intake_leads',
          retentionDays: 180,
          action: RetentionAction.anonymize,
          description: 'Old leads',
          isActive: true,
        }),
      });
    });
  });

  describe('update', () => {
    it('validates action against entity type', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(
        ruleRow({ entityType: 'audit_logs', action: RetentionAction.delete }),
      );

      await expect(
        service.update('r1', { action: RetentionAction.anonymize }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates mutable fields', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(ruleRow());
      prisma.retentionRule.update.mockResolvedValue(
        ruleRow({ retentionDays: 730, isActive: false }),
      );

      await service.update('r1', {
        retentionDays: 730,
        isActive: false,
        description: null,
      });

      expect(prisma.retentionRule.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: expect.objectContaining({
          retentionDays: 730,
          isActive: false,
          description: null,
        }),
      });
    });
  });

  describe('deactivate', () => {
    it('sets isActive to false', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(ruleRow());
      prisma.retentionRule.update.mockResolvedValue(
        ruleRow({ isActive: false }),
      );

      await service.deactivate('r1');

      expect(prisma.retentionRule.update).toHaveBeenCalledWith({
        where: { id: 'r1' },
        data: { isActive: false },
      });
    });
  });

  describe('dryRun', () => {
    it('counts intake leads matching conditions', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(
        ruleRow({
          conditionJson: { statusNotIn: ['converted'] },
        }),
      );
      prisma.intakeLead.count.mockResolvedValue(12);

      const result = await service.dryRun('r1');

      expect(prisma.intakeLead.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyName: { not: '[redacted]' },
          status: { notIn: ['converted'] },
          updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      });
      expect(result.wouldAffect).toBe(12);
      expect(result.entityType).toBe('intake_leads');
    });

    it('counts audit logs for delete rules', async () => {
      prisma.retentionRule.findUnique.mockResolvedValue(
        ruleRow({
          entityType: 'audit_logs',
          action: RetentionAction.delete,
        }),
      );
      prisma.auditLog.count.mockResolvedValue(500);

      const result = await service.dryRun('r1');

      expect(prisma.auditLog.count).toHaveBeenCalled();
      expect(result.wouldAffect).toBe(500);
    });
  });
});
