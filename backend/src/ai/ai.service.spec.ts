import type { AiProviderFactory } from './ai-provider.factory';
import {
  AI_DRAFT_SYSTEM_PROMPT,
  AI_RULE_EXPLAIN_SYSTEM_PROMPT,
  AI_SUMMARIZE_SYSTEM_PROMPT,
} from './ai.constants';
import { AiService } from './ai.service';

describe('AiService', () => {
  const provider = {
    name: 'mock',
    model: 'mock-model',
    generateText: jest.fn(),
    generateStructuredJson: jest.fn(),
  };
  const factory = { create: jest.fn(() => provider) };
  const service = new AiService(factory as unknown as AiProviderFactory);

  beforeEach(() => jest.clearAllMocks());

  it('exposes provider metadata', () => {
    expect(service.getProviderMeta()).toEqual({
      name: 'mock',
      model: 'mock-model',
    });
  });

  it('summarizeText builds prompt and calls provider', async () => {
    provider.generateText.mockResolvedValue('- point');
    const result = await service.summarizeText('  hello world  ', 2);
    expect(result).toBe('- point');
    expect(provider.generateText).toHaveBeenCalledWith(
      expect.stringContaining('Return exactly 2 short bullet points'),
      AI_SUMMARIZE_SYSTEM_PROMPT,
      { temperature: 0.2 },
    );
    expect(provider.generateText.mock.calls[0][0]).toContain('hello world');
  });

  it('explainRule includes rule fields', async () => {
    provider.generateText.mockResolvedValue('Due soon.');
    await service.explainRule({
      title: 'OA response',
      dueDate: '2026-01-01',
      offsetDays: 3,
      triggerType: 'office_action',
      jurisdiction: 'US',
      ruleDescription: 'Respond within 3 months',
      context: 'Client asked for extension',
    });
    const prompt = provider.generateText.mock.calls[0][0] as string;
    expect(prompt).toContain('OA response');
    expect(prompt).toContain('2026-01-01');
    expect(prompt).toContain('Respond within 3 months');
    expect(provider.generateText).toHaveBeenCalledWith(
      prompt,
      AI_RULE_EXPLAIN_SYSTEM_PROMPT,
      { temperature: 0.2 },
    );
  });

  it('generateDraft uses draft system prompt', async () => {
    provider.generateText.mockResolvedValue('Draft body');
    await service.generateDraft('Question?', 'Matter context');
    expect(provider.generateText).toHaveBeenCalledWith(
      expect.stringContaining('Question?'),
      AI_DRAFT_SYSTEM_PROMPT,
      { temperature: 0.4 },
    );
  });

  it('delegates generateText and generateStructuredJson', async () => {
    provider.generateText.mockResolvedValue('text');
    provider.generateStructuredJson.mockResolvedValue({ ok: true });
    await expect(service.generateText('p', 'sys')).resolves.toBe('text');
    await expect(
      service.generateStructuredJson('p', { type: 'object' }, 'sys'),
    ).resolves.toEqual({ ok: true });
  });
});
