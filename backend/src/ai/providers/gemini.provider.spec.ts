import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

const generateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn(() => ({ generateContent })),
  })),
}));

describe('GeminiProvider', () => {
  function provider(apiKey?: string) {
    const config = {
      get: (key: string) => {
        if (key === 'GEMINI_API_KEY') return apiKey;
        if (key === 'GEMINI_MODEL') return 'gemini-test';
        return undefined;
      },
    } as unknown as ConfigService;
    return new GeminiProvider(config);
  }

  beforeEach(() => {
    generateContent.mockReset();
  });

  it('throws when API key is missing', async () => {
    const p = provider('');
    await expect(p.generateText('hi')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('returns trimmed text from generateContent', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '  answer  ' },
    });
    const p = provider('key');
    await expect(p.generateText('prompt', 'system')).resolves.toBe('answer');
  });

  it('generateStructuredJson parses JSON', async () => {
    generateContent.mockResolvedValue({
      response: { text: () => '{"count":2}' },
    });
    const p = provider('key');
    await expect(
      p.generateStructuredJson<{ count: number }>('prompt', { type: 'object' }),
    ).resolves.toEqual({ count: 2 });
  });
});
