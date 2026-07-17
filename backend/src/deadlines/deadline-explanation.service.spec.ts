import { AI_CACHE_TTL_MS } from '../ai/ai.constants';
import type { AiService } from '../ai/ai.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DeadlineExplanationService } from './deadline-explanation.service';
import type { DeadlinesService } from './deadlines.service';

describe('DeadlineExplanationService', () => {
  const deadlines = { findById: jest.fn() };
  const ai = {
    getProviderMeta: jest.fn(),
    explainRule: jest.fn(),
  };
  const prisma = {
    deadline: { update: jest.fn() },
  };

  const service = new DeadlineExplanationService(
    deadlines as unknown as DeadlinesService,
    ai as unknown as AiService,
    prisma as unknown as PrismaService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    ai.getProviderMeta.mockReturnValue({ name: 'mock', model: 'mock-model' });
  });

  it('returns manual message when deadline has no rule', async () => {
    deadlines.findById.mockResolvedValue({
      id: 'd1',
      title: 'Manual filing',
      dueDate: new Date('2026-03-01'),
      ruleId: null,
      rule: null,
      metadata: {},
    });

    const result = await service.explain('d1');

    expect(result).toEqual({
      explanation: 'This is a manually entered deadline.',
      cached: false,
      manual: true,
      model: null,
    });
    expect(ai.explainRule).not.toHaveBeenCalled();
  });

  it('returns fresh cached explanation without calling AI', async () => {
    const generatedAt = new Date().toISOString();
    deadlines.findById.mockResolvedValue({
      id: 'd1',
      title: 'Reply',
      dueDate: new Date('2026-03-01'),
      jurisdiction: 'EU',
      ruleId: 'rule-1',
      rule: {
        daysOffset: 3,
        triggerType: 'matter_created',
        jurisdiction: 'EU',
        description: 'Reply deadline',
      },
      metadata: {
        aiExplanation: {
          text: 'Cached explanation',
          generatedAt,
          model: 'mock-model',
        },
      },
    });

    const result = await service.explain('d1');

    expect(result).toEqual({
      explanation: 'Cached explanation',
      cached: true,
      manual: false,
      model: 'mock-model',
    });
    expect(ai.explainRule).not.toHaveBeenCalled();
  });

  it('regenerates when cache is stale and persists new explanation', async () => {
    const stale = new Date(Date.now() - AI_CACHE_TTL_MS - 1000).toISOString();
    deadlines.findById.mockResolvedValue({
      id: 'd1',
      title: 'Reply',
      dueDate: new Date('2026-03-01'),
      jurisdiction: 'EU',
      ruleId: 'rule-1',
      rule: {
        daysOffset: 3,
        triggerType: 'matter_created',
        jurisdiction: 'EU',
        description: 'Reply deadline',
      },
      metadata: {
        aiExplanation: { text: 'old', generatedAt: stale, model: 'old-model' },
      },
    });
    ai.explainRule.mockResolvedValue('Fresh explanation');
    prisma.deadline.update.mockResolvedValue({});

    const result = await service.explain('d1');

    expect(result.cached).toBe(false);
    expect(result.explanation).toBe('Fresh explanation');
    expect(result.model).toBe('mock-model');
    expect(ai.explainRule).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Reply',
        offsetDays: 3,
        jurisdiction: 'EU',
      }),
    );
    expect(prisma.deadline.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: {
        metadata: expect.objectContaining({
          aiExplanation: expect.objectContaining({
            text: 'Fresh explanation',
            model: 'mock-model',
          }),
        }),
      },
    });
  });
});
