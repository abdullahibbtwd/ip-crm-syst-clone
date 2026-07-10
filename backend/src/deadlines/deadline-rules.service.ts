import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDeadlineRuleDto,
  ListDeadlineRulesQueryDto,
  UpdateDeadlineRuleDto,
} from './dto/deadline-rule.dto';

@Injectable()
export class DeadlineRulesService {
  constructor(private readonly prisma: PrismaService) {}

  list(query: ListDeadlineRulesQueryDto = {}) {
    const where: Prisma.DeadlineRuleWhereInput = {};
    if (query.jurisdiction) {
      where.jurisdiction = query.jurisdiction.trim().toUpperCase();
    }
    if (query.matterType) where.matterType = query.matterType;
    if (query.triggerType) where.triggerType = query.triggerType;
    if (query.activeOnly) where.isActive = true;

    return this.prisma.deadlineRule.findMany({
      where,
      orderBy: [
        { jurisdiction: 'asc' },
        { matterType: 'asc' },
        { triggerType: 'asc' },
        { priority: 'asc' },
      ],
    });
  }

  async findById(id: string) {
    const rule = await this.prisma.deadlineRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Deadline rule not found');
    return rule;
  }

  async create(dto: CreateDeadlineRuleDto) {
    const jurisdiction = dto.jurisdiction.trim().toUpperCase();
    try {
      return await this.prisma.deadlineRule.create({
        data: {
          jurisdiction,
          matterType: dto.matterType,
          eventType: dto.eventType,
          triggerType: dto.triggerType,
          daysOffset: dto.daysOffset,
          isBusinessDays: dto.isBusinessDays ?? true,
          gracePeriodDays: dto.gracePeriodDays ?? 0,
          priority: dto.priority ?? 2,
          description: dto.description?.trim() || null,
          isActive: true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A rule already exists for this jurisdiction, matter type, event type, and trigger',
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateDeadlineRuleDto) {
    await this.findById(id);
    return this.prisma.deadlineRule.update({
      where: { id },
      data: {
        daysOffset: dto.daysOffset,
        isBusinessDays: dto.isBusinessDays,
        gracePeriodDays: dto.gracePeriodDays,
        priority: dto.priority,
        description:
          dto.description === undefined
            ? undefined
            : dto.description?.trim() || null,
        isActive: dto.isActive,
      },
    });
  }

  /** Soft-deactivate — never hard-delete (deadlines reference rule_id). */
  async deactivate(id: string) {
    await this.findById(id);
    return this.prisma.deadlineRule.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
