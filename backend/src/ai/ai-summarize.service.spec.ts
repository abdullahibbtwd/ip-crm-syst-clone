import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AI_CACHE_TTL_MS } from './ai.constants';
import { AiSummarizeService } from './ai-summarize.service';
import type { AiService } from './ai.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('AiSummarizeService', () => {
  const prisma = {
    correspondence: { findUnique: jest.fn(), update: jest.fn() },
    unlinkedEmail: { findUnique: jest.fn(), update: jest.fn() },
  };
  const ai = {
    getProviderMeta: jest.fn(),
    summarizeText: jest.fn(),
  };
  const service = new AiSummarizeService(
    prisma as unknown as PrismaService,
    ai as unknown as AiService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    ai.getProviderMeta.mockReturnValue({ name: 'mock', model: 'mock-model' });
  });

  it('returns fresh cached summary without calling AI', async () => {
    const generatedAt = new Date().toISOString();
    prisma.correspondence.findUnique.mockResolvedValue({
      bodyText: 'body',
      metadata: {
        aiSummary: { text: 'cached', generatedAt, model: 'mock-model' },
      },
    });

    const result = await service.summarize({
      targetId: 'c1',
      targetType: 'correspondence',
    });

    expect(result).toEqual({
      summary: 'cached',
      cached: true,
      model: 'mock-model',
    });
    expect(ai.summarizeText).not.toHaveBeenCalled();
  });

  it('regenerates when cache is stale', async () => {
    const stale = new Date(Date.now() - AI_CACHE_TTL_MS - 1000).toISOString();
    prisma.correspondence.findUnique.mockResolvedValue({
      bodyText: 'body',
      metadata: { aiSummary: { text: 'old', generatedAt: stale, model: 'x' } },
    });
    prisma.correspondence.update.mockResolvedValue({});
    ai.summarizeText.mockResolvedValue('fresh summary');

    const result = await service.summarize({
      targetId: 'c1',
      targetType: 'correspondence',
    });

    expect(result.cached).toBe(false);
    expect(result.summary).toBe('fresh summary');
    expect(prisma.correspondence.update).toHaveBeenCalled();
  });

  it('uses override text when provided', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue({
      bodyText: null,
      metadata: {},
    });
    prisma.unlinkedEmail.update.mockResolvedValue({});
    ai.summarizeText.mockResolvedValue('from override');

    await service.summarize({
      targetId: 'u1',
      targetType: 'unlinked_email',
      text: ' override text ',
    });

    expect(ai.summarizeText).toHaveBeenCalledWith('override text');
  });

  it('throws when no text is available', async () => {
    prisma.correspondence.findUnique.mockResolvedValue({
      bodyText: '   ',
      metadata: {},
    });
    await expect(
      service.summarize({ targetId: 'c1', targetType: 'correspondence' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when correspondence is missing', async () => {
    prisma.correspondence.findUnique.mockResolvedValue(null);
    await expect(
      service.summarize({ targetId: 'missing', targetType: 'correspondence' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when unlinked email is missing', async () => {
    prisma.unlinkedEmail.findUnique.mockResolvedValue(null);
    await expect(
      service.summarize({ targetId: 'missing', targetType: 'unlinked_email' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
