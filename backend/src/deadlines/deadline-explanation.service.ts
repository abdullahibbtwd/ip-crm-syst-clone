import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AI_CACHE_TTL_MS } from '../ai/ai.constants';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { DeadlinesService } from './deadlines.service';

export type AiExplanationCache = {
  text: string;
  generatedAt: string;
  model: string;
};

type DeadlineMetadata = Record<string, unknown> & {
  aiExplanation?: AiExplanationCache;
};

@Injectable()
export class DeadlineExplanationService {
  constructor(
    private readonly deadlines: DeadlinesService,
    private readonly ai: AiService,
    private readonly prisma: PrismaService,
  ) {}

  async explain(deadlineId: string): Promise<{
    explanation: string;
    cached: boolean;
    manual: boolean;
    model: string | null;
  }> {
    const deadline = await this.deadlines.findById(deadlineId);
    const metadata = (deadline.metadata ?? {}) as DeadlineMetadata;

    if (!deadline.ruleId || !deadline.rule) {
      return {
        explanation: 'This is a manually entered deadline.',
        cached: false,
        manual: true,
        model: null,
      };
    }

    const cached = this.readFreshCache(metadata.aiExplanation);
    if (cached) {
      return {
        explanation: cached.text,
        cached: true,
        manual: false,
        model: cached.model,
      };
    }

    const provider = this.ai.getProviderMeta();
    const explanation = await this.ai.explainRule({
      title: deadline.title,
      dueDate: deadline.dueDate.toISOString(),
      offsetDays: deadline.rule.daysOffset,
      triggerType: deadline.rule.triggerType,
      jurisdiction:
        deadline.jurisdiction ?? deadline.rule.jurisdiction ?? null,
      ruleDescription: deadline.rule.description,
    });

    const aiExplanation: AiExplanationCache = {
      text: explanation,
      generatedAt: new Date().toISOString(),
      model: provider.model,
    };

    await this.prisma.deadline.update({
      where: { id: deadlineId },
      data: {
        metadata: {
          ...metadata,
          aiExplanation,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      explanation,
      cached: false,
      manual: false,
      model: provider.model,
    };
  }

  private readFreshCache(
    cache: AiExplanationCache | undefined,
  ): AiExplanationCache | null {
    if (!cache?.text || !cache.generatedAt) return null;
    const generatedAt = Date.parse(cache.generatedAt);
    if (Number.isNaN(generatedAt)) return null;
    if (Date.now() - generatedAt > AI_CACHE_TTL_MS) return null;
    return cache;
  }
}
