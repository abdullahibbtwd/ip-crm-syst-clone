import { ConfigService } from '@nestjs/config';
import { AiProviderFactory } from './ai-provider.factory';

describe('AiProviderFactory', () => {
  const gemini = { name: 'gemini' };
  const openai = { name: 'openai' };
  const anthropic = { name: 'anthropic' };

  function factory(provider?: string) {
    return new AiProviderFactory(
      { get: () => provider } as unknown as ConfigService,
      gemini as never,
      openai as never,
      anthropic as never,
    );
  }

  it('defaults to gemini', () => {
    expect(factory(undefined).create()).toBe(gemini);
    expect(factory('').create()).toBe(gemini);
  });

  it('selects openai and anthropic', () => {
    expect(factory('openai').create()).toBe(openai);
    expect(factory('Anthropic').create()).toBe(anthropic);
  });

  it('falls back to gemini for unknown providers', () => {
    expect(factory('unknown').create()).toBe(gemini);
  });
});
