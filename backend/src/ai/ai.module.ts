import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiProviderFactory } from './ai-provider.factory';
import { AiService } from './ai.service';
import { AiSummarizeService } from './ai-summarize.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  controllers: [AiController],
  providers: [
    GeminiProvider,
    OpenAiProvider,
    AnthropicProvider,
    AiProviderFactory,
    AiService,
    AiSummarizeService,
  ],
  exports: [AiService, AiProviderFactory],
})
export class AiModule {}
