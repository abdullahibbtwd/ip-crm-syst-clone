import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AI_CACHE_TTL_MS } from './ai.constants';
import { AiService } from './ai.service';
import type { AiSummarizeTargetType } from './dto/summarize.dto';

export type AiSummaryCache = {
  text: string;
  generatedAt: string;
  model: string;
};

type EntityMetadata = Record<string, unknown> & {
  aiSummary?: AiSummaryCache;
};

@Injectable()
export class AiSummarizeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  async summarize(input: {
    targetId: string;
    targetType: AiSummarizeTargetType;
    text?: string;
  }): Promise<{ summary: string; cached: boolean; model: string }> {
    const provider = this.ai.getProviderMeta();
    const entity = await this.loadEntity(input.targetType, input.targetId);
    const metadata = (entity.metadata ?? {}) as EntityMetadata;
    const cached = this.readFreshCache(metadata.aiSummary);
    if (cached) {
      return { summary: cached.text, cached: true, model: cached.model };
    }

    const body = input.text?.trim() || entity.bodyText?.trim();
    if (!body) {
      throw new BadRequestException('No text available to summarise');
    }

    const summary = await this.ai.summarizeText(body);
    const aiSummary: AiSummaryCache = {
      text: summary,
      generatedAt: new Date().toISOString(),
      model: provider.model,
    };

    await this.persistSummary(input.targetType, input.targetId, {
      ...metadata,
      aiSummary,
    });

    return { summary, cached: false, model: provider.model };
  }

  private readFreshCache(
    cache: AiSummaryCache | undefined,
  ): AiSummaryCache | null {
    if (!cache?.text || !cache.generatedAt) return null;
    const generatedAt = Date.parse(cache.generatedAt);
    if (Number.isNaN(generatedAt)) return null;
    if (Date.now() - generatedAt > AI_CACHE_TTL_MS) return null;
    return cache;
  }

  private async loadEntity(
    targetType: AiSummarizeTargetType,
    targetId: string,
  ): Promise<{ bodyText: string | null; metadata: Prisma.JsonValue | null }> {
    if (targetType === 'unlinked_email') {
      const row = await this.prisma.unlinkedEmail.findUnique({
        where: { id: targetId },
        select: { bodyText: true, metadata: true },
      });
      if (!row) throw new NotFoundException('Queued email not found');
      return row;
    }

    const row = await this.prisma.correspondence.findUnique({
      where: { id: targetId },
      select: { bodyText: true, metadata: true },
    });
    if (!row) throw new NotFoundException('Correspondence not found');
    return row;
  }

  private async persistSummary(
    targetType: AiSummarizeTargetType,
    targetId: string,
    metadata: EntityMetadata,
  ) {
    const data = { metadata: metadata as Prisma.InputJsonValue };
    if (targetType === 'unlinked_email') {
      await this.prisma.unlinkedEmail.update({ where: { id: targetId }, data });
      return;
    }
    await this.prisma.correspondence.update({ where: { id: targetId }, data });
  }
}
