import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IntakeStatus,
  Prisma,
  RetentionAction,
  RetentionRule,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRetentionRuleDto,
  RETENTION_ENTITY_TYPES,
  UpdateRetentionRuleDto,
} from './dto/retention-rule.dto';

const REDACTED = '[redacted]';

type RetentionCondition = {
  status?: string;
  statusNotIn?: string[];
};

@Injectable()
export class RetentionRulesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.retentionRule.findMany({
      orderBy: [{ entityType: 'asc' }, { retentionDays: 'asc' }],
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.retentionRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Retention rule not found');
    return rule;
  }

  create(dto: CreateRetentionRuleDto) {
    this.assertEntityAction(dto.entityType, dto.action);
    return this.prisma.retentionRule.create({
      data: {
        entityType: dto.entityType,
        conditionJson: (dto.conditionJson ?? {}) as Prisma.InputJsonValue,
        retentionDays: dto.retentionDays,
        action: dto.action,
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });
  }

  async update(id: string, dto: UpdateRetentionRuleDto) {
    const existing = await this.findById(id);
    const action = dto.action ?? existing.action;
    this.assertEntityAction(existing.entityType, action);
    return this.prisma.retentionRule.update({
      where: { id },
      data: {
        conditionJson:
          dto.conditionJson === undefined
            ? undefined
            : (dto.conditionJson as Prisma.InputJsonValue),
        retentionDays: dto.retentionDays,
        action: dto.action,
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        isActive: dto.isActive,
      },
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.retentionRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Count-only preview of records that would be affected (no mutations). */
  async dryRun(id: string): Promise<{
    ruleId: string;
    entityType: string;
    action: RetentionAction;
    retentionDays: number;
    cutoff: string;
    wouldAffect: number;
  }> {
    const rule = await this.findById(id);
    const cutoff = this.cutoffDate(rule.retentionDays);
    const wouldAffect = await this.countAffected(rule, cutoff);
    return {
      ruleId: rule.id,
      entityType: rule.entityType,
      action: rule.action,
      retentionDays: rule.retentionDays,
      cutoff: cutoff.toISOString(),
      wouldAffect,
    };
  }

  private assertEntityAction(entityType: string, action: RetentionAction) {
    if (
      !(RETENTION_ENTITY_TYPES as readonly string[]).includes(entityType)
    ) {
      throw new BadRequestException(`Unsupported entity type: ${entityType}`);
    }
    if (
      entityType === 'audit_logs' &&
      action !== RetentionAction.delete
    ) {
      throw new BadRequestException(
        'Audit log retention only supports the delete action',
      );
    }
  }

  private cutoffDate(retentionDays: number) {
    const d = new Date();
    d.setDate(d.getDate() - retentionDays);
    return d;
  }

  private async countAffected(rule: RetentionRule, cutoff: Date) {
    switch (rule.entityType) {
      case 'intake_leads': {
        const condition = rule.conditionJson as RetentionCondition;
        const where: Record<string, unknown> = {
          updatedAt: { lt: cutoff },
          companyName: { not: REDACTED },
        };
        if (condition.status) where.status = condition.status as IntakeStatus;
        if (condition.statusNotIn?.length) {
          where.status = { notIn: condition.statusNotIn };
        }
        return this.prisma.intakeLead.count({ where });
      }
      case 'audit_logs':
        return this.prisma.auditLog.count({
          where: { createdAt: { lt: cutoff } },
        });
      default:
        return 0;
    }
  }
}
