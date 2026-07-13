import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  AiGenerateOptions,
  AiProvider,
} from '../interfaces/ai-provider.interface';
import { parseJsonFromModelText } from './parse-json.util';
import { mapOpenAiError, resolveOpenAiModel } from './openai.util';

@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly name = 'openai';
  readonly model: string;
  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly client: OpenAI | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim() ?? '';
    this.model = resolveOpenAiModel(this.config.get<string>('OPENAI_MODEL'));
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not set — AI generation calls will fail until configured',
      );
    } else {
      this.logger.log(`OpenAI model: ${this.model}`);
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiGenerateOptions,
  ): Promise<string> {
    try {
      const client = this.requireClient();
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: options?.temperature ?? 0.3,
        messages: [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          { role: 'user' as const, content: prompt },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty response',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `OpenAI error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapOpenAiError(error, this.model);
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
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          ...(systemPrompt
            ? [{ role: 'system' as const, content: systemPrompt }]
            : []),
          { role: 'user' as const, content: fullPrompt },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty JSON response',
        );
      }
      return parseJsonFromModelText<T>(text);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `OpenAI error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapOpenAiError(error, this.model);
    }
  }

  private requireClient(): OpenAI {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI provider is not configured (missing OPENAI_API_KEY)',
      );
    }
    return this.client;
  }
}
