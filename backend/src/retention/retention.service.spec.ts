import {
  IntakeStatus,
  RetentionAction,
  RetentionRule,
} from '../../generated/prisma/client';
import type { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RetentionService } from './retention.service';

function ruleRow(overrides: Partial<RetentionRule> = {}): RetentionRule {
  return {
    id: 'r1',
    entityType: 'intake_leads',
    conditionJson: { status: IntakeStatus.closed_lost },
    retentionDays: 365,
    action: RetentionAction.anonymize,
    description: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('RetentionService', () => {
  let service: RetentionService;
  let prisma: {
    retentionRule: { findMany: jest.Mock };
    intakeLead: {
      findMany: jest.Mock;
      deleteMany: jest.Mock;
      update: jest.Mock;
    };
    counterparty: { updateMany: jest.Mock };
    auditLog: { deleteMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    prisma = {
      retentionRule: { findMany: jest.fn() },
      intakeLead: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
      counterparty: { updateMany: jest.fn() },
      auditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $transaction: jest.fn(async (fn) => fn(prisma)),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new RetentionService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  describe('runAllRules', () => {
    it('processes each active rule and sums affected records', async () => {
      prisma.retentionRule.findMany.mockResolvedValue([
        ruleRow({ id: 'r1', action: RetentionAction.delete }),
        ruleRow({
          id: 'r2',
          entityType: 'audit_logs',
          action: RetentionAction.delete,
        }),
      ]);
      prisma.intakeLead.findMany.mockResolvedValue([{ id: 'l1' }, { id: 'l2' }]);
      prisma.intakeLead.deleteMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.runAllRules();

      expect(result.rulesProcessed).toBe(2);
      expect(result.recordsAffected).toBe(7);
      expect(audit.log).toHaveBeenCalledTimes(2);
    });

    it('anonymizes intake leads when action is anonymize', async () => {
      prisma.retentionRule.findMany.mockResolvedValue([ruleRow()]);
      prisma.intakeLead.findMany.mockResolvedValue([{ id: 'l1' }]);

      const result = await service.runAllRules();

      expect(prisma.intakeLead.update).toHaveBeenCalledWith({
        where: { id: 'l1' },
        data: expect.objectContaining({
          companyName: '[redacted]',
          fullName: '[redacted]',
          email: null,
        }),
      });
      expect(prisma.counterparty.updateMany).toHaveBeenCalledWith({
        where: { intakeLeadId: 'l1' },
        data: { name: '[redacted]', company: '[redacted]' },
      });
      expect(result.recordsAffected).toBe(1);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'retention_rule_executed',
          resource: 'intake_leads',
        }),
      );
    });

    it('returns zero when no leads match', async () => {
      prisma.retentionRule.findMany.mockResolvedValue([ruleRow()]);
      prisma.intakeLead.findMany.mockResolvedValue([]);

      const result = await service.runAllRules();

      expect(result.recordsAffected).toBe(0);
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('ignores non-delete audit log actions', async () => {
      prisma.retentionRule.findMany.mockResolvedValue([
        ruleRow({
          entityType: 'audit_logs',
          action: RetentionAction.anonymize,
        }),
      ]);

      const result = await service.runAllRules();

      expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
      expect(result.recordsAffected).toBe(0);
    });
  });
});
