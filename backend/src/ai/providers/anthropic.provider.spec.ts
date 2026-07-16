import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './anthropic.provider';

const messagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: messagesCreate },
  }));
});

describe('AnthropicProvider', () => {
  function provider(apiKey?: string) {
    const config = {
      get: (key: string) => {
        if (key === 'ANTHROPIC_API_KEY') return apiKey;
        if (key === 'ANTHROPIC_MODEL') return 'claude-test';
        return undefined;
      },
    } as unknown as ConfigService;
    return new AnthropicProvider(config);
  }

  beforeEach(() => {
    messagesCreate.mockReset();
  });

  it('throws when API key is missing', async () => {
    const p = provider('');
    await expect(p.generateText('hi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns joined text blocks', async () => {
    messagesCreate.mockResolvedValue({
      content: [
        { type: 'text', text: 'Line 1' },
        { type: 'text', text: 'Line 2' },
      ],
    });
    const p = provider('key');
    await expect(p.generateText('prompt', 'system')).resolves.toBe(
      'Line 1\nLine 2',
    );
  });

  it('generateStructuredJson parses JSON from text block', async () => {
    messagesCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"done":true}' }],
    });
    const p = provider('key');
    await expect(
      p.generateStructuredJson<{ done: boolean }>('prompt', { type: 'object' }),
    ).resolves.toEqual({ done: true });
  });
});
