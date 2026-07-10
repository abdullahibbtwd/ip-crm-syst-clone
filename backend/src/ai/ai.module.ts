import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiProviderFactory } from './ai-provider.factory';
import { AiService } from './ai.service';
import { AiSummarizeService } from './ai-summarize.service';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  controllers: [AiController],
  providers: [
    GeminiProvider,
    AiProviderFactory,
    AiService,
    AiSummarizeService,
  ],
  exports: [AiService, AiProviderFactory],
})
export class AiModule {}
