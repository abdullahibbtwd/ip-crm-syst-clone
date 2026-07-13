import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import type {
  AiGenerateOptions,
  AiProvider,
} from '../interfaces/ai-provider.interface';
import {
  mapAnthropicError,
  resolveAnthropicModel,
} from './anthropic.util';
import { parseJsonFromModelText } from './parse-json.util';

@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY')?.trim() ?? '';
    this.model = resolveAnthropicModel(
      this.config.get<string>('ANTHROPIC_MODEL'),
    );
    this.client = apiKey ? new Anthropic({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — AI generation calls will fail until configured',
      );
    } else {
      this.logger.log(`Anthropic model: ${this.model}`);
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiGenerateOptions,
  ): Promise<string> {
    try {
      const client = this.requireClient();
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: options?.temperature ?? 0.3,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = this.extractText(message.content);
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty response',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Anthropic error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapAnthropicError(error, this.model);
    }
  }

  async generateStructuredJson<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
  ): Promise<T> {
    try {
      const client = this.requireClient();
      const schemaHint = JSON.stringify(schema);
      const fullPrompt = `${prompt}\n\nRespond with JSON only that matches this schema:\n${schemaHint}`;
      const jsonSystem = [
        systemPrompt?.trim(),
        'You must respond with valid JSON only. Do not include markdown fences or commentary.',
      ]
        .filter(Boolean)
        .join('\n\n');
      const message = await client.messages.create({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.1,
        system: jsonSystem,
        messages: [{ role: 'user', content: fullPrompt }],
      });
      const text = this.extractText(message.content);
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty JSON response',
        );
      }
      return parseJsonFromModelText<T>(text);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Anthropic error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapAnthropicError(error, this.model);
    }
  }

  private requireClient(): Anthropic {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI provider is not configured (missing ANTHROPIC_API_KEY)',
      );
    }
    return this.client;
  }

  private extractText(
    content: Anthropic.Messages.ContentBlock[],
  ): string | undefined {
    const parts = content
      .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
      .map((block) => block.text);
    const text = parts.join('\n').trim();
    return text || undefined;
  }
}
