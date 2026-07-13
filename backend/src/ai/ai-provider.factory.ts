import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './interfaces/ai-provider.interface';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';

export type AiProviderName = 'gemini' | 'openai' | 'anthropic';

/**
 * Resolves the active AI provider from `AI_PROVIDER`.
 */
@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiProvider,
    private readonly openai: OpenAiProvider,
    private readonly anthropic: AnthropicProvider,
  ) {}

  create(): AiProvider {
    const configured = (
      this.config.get<string>('AI_PROVIDER')?.trim().toLowerCase() || 'gemini'
    ) as AiProviderName;

    switch (configured) {
      case 'gemini':
        return this.gemini;
      case 'openai':
        return this.openai;
      case 'anthropic':
        return this.anthropic;
      default:
        this.logger.warn(
          `Unknown AI_PROVIDER="${configured}"; falling back to GeminiProvider`,
        );
        return this.gemini;
    }
  }
}
