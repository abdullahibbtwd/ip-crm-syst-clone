import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('OpenAiProvider', () => {
  function provider(apiKey?: string) {
    const config = {
      get: (key: string) => {
        if (key === 'OPENAI_API_KEY') return apiKey;
        if (key === 'OPENAI_MODEL') return 'gpt-test';
        return undefined;
      },
    } as unknown as ConfigService;
    return new OpenAiProvider(config);
  }

  it('throws when API key is missing', async () => {
    const p = provider('');
    await expect(p.generateText('hi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns trimmed text from chat completion', async () => {
    const p = provider('sk-test');
    const client = (p as unknown as { client: { chat: { completions: { create: jest.Mock } } } }).client;
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '  summary  ' } }],
    });

    await expect(p.generateText('prompt', 'system')).resolves.toBe('summary');
    expect(client.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-test',
        messages: [
          { role: 'system', content: 'system' },
          { role: 'user', content: 'prompt' },
        ],
      }),
    );
  });

  it('generateStructuredJson parses JSON response', async () => {
    const p = provider('sk-test');
    const client = (p as unknown as { client: { chat: { completions: { create: jest.Mock } } } }).client;
    client.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
    });

    await expect(
      p.generateStructuredJson<{ ok: boolean }>('prompt', { type: 'object' }),
    ).resolves.toEqual({ ok: true });
  });
});
