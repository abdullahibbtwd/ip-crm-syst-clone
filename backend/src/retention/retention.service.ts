import { Injectable, Logger } from '@nestjs/common';
import {
  IntakeStatus,
  RetentionAction,
  RetentionRule,
} from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { RETENTION_MODULE } from './retention.constants';

const REDACTED = '[redacted]';

type RetentionCondition = {
  status?: string;
  statusNotIn?: string[];
};

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async runAllRules() {
    const rules = await this.prisma.retentionRule.findMany({
      where: { isActive: true },
      orderBy: { entityType: 'asc' },
    });

    let totalAffected = 0;
    for (const rule of rules) {
      const affected = await this.applyRule(rule);
      totalAffected += affected;
    }

    return { rulesProcessed: rules.length, recordsAffected: totalAffected };
  }

  private async applyRule(rule: RetentionRule): Promise<number> {
    switch (rule.entityType) {
      case 'intake_leads':
        return this.applyIntakeLeadRule(rule);
      case 'audit_logs':
        return this.applyAuditLogRule(rule);
      default:
        this.logger.warn(`No handler for retention entity: ${rule.entityType}`);
        return 0;
    }
  }

  private async applyIntakeLeadRule(rule: RetentionRule): Promise<number> {
    const condition = rule.conditionJson as RetentionCondition;
    const cutoff = this.cutoffDate(rule.retentionDays);

    const where: Record<string, unknown> = {
      updatedAt: { lt: cutoff },
      companyName: { not: REDACTED },
    };

    if (condition.status) {
      where.status = condition.status;
    }
    if (condition.statusNotIn?.length) {
      where.status = { notIn: condition.statusNotIn };
    }

    const leads = await this.prisma.intakeLead.findMany({
      where,
      select: { id: true },
      take: 500,
    });

    if (leads.length === 0) return 0;

    if (rule.action === RetentionAction.delete) {
      const ids = leads.map((l) => l.id);
      await this.prisma.intakeLead.deleteMany({ where: { id: { in: ids } } });
      await this.logRetention(rule, ids.length, { entityIds: ids });
      return ids.length;
    }

    let affected = 0;
    for (const lead of leads) {
      await this.prisma.$transaction(async (tx) => {
        await tx.intakeLead.update({
          where: { id: lead.id },
          data: {
            companyName: REDACTED,
            fullName: REDACTED,
            email: null,
            phone: null,
            description: REDACTED,
            notes: null,
            referredBy: null,
          },
        });
        await tx.counterparty.updateMany({
          where: { intakeLeadId: lead.id },
          data: { name: REDACTED, company: REDACTED },
        });
      });
      affected += 1;
    }

    if (affected > 0) {
      await this.logRetention(rule, affected, {
        intakeLeadIds: leads.slice(0, affected).map((l) => l.id),
      });
    }

    return affected;
  }

  private async applyAuditLogRule(rule: RetentionRule): Promise<number> {
    if (rule.action !== RetentionAction.delete) return 0;

    const cutoff = this.cutoffDate(rule.retentionDays);
    const result = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    if (result.count > 0) {
      await this.logRetention(rule, result.count, { cutoffBefore: cutoff.toISOString() });
    }

    return result.count;
  }

  private cutoffDate(retentionDays: number) {
    const d = new Date();
    d.setDate(d.getDate() - retentionDays);
    return d;
  }

  private async logRetention(
    rule: RetentionRule,
    count: number,
    metadata: Record<string, unknown>,
  ) {
    await this.audit.log({
      action: 'retention_rule_executed',
      resource: rule.entityType,
      resourceId: rule.id,
      module: RETENTION_MODULE,
      metadata: {
        ruleId: rule.id,
        entityType: rule.entityType,
        retentionAction: rule.action,
        recordsAffected: count,
        ...metadata,
      },
    });
  }
}
