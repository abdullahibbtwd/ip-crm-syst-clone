import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AiProvider } from './interfaces/ai-provider.interface';
import { GeminiProvider } from './providers/gemini.provider';

export type AiProviderName = 'gemini' | 'openai' | 'anthropic';

/**
 * Resolves the active AI provider from `AI_PROVIDER`.
 * Only Gemini is implemented today; openai/anthropic are reserved for future providers.
 */
@Injectable()
export class AiProviderFactory {
  private readonly logger = new Logger(AiProviderFactory.name);

  constructor(
    private readonly config: ConfigService,
    private readonly gemini: GeminiProvider,
  ) {}

  create(): AiProvider {
    const configured = (
      this.config.get<string>('AI_PROVIDER')?.trim().toLowerCase() || 'gemini'
    ) as AiProviderName;

    switch (configured) {
      case 'gemini':
        return this.gemini;
      case 'openai':
      case 'anthropic':
        this.logger.warn(
          `AI_PROVIDER=${configured} is not implemented yet; falling back to GeminiProvider`,
        );
        return this.gemini;
      default:
        this.logger.warn(
          `Unknown AI_PROVIDER="${configured}"; falling back to GeminiProvider`,
        );
        return this.gemini;
    }
  }
}
