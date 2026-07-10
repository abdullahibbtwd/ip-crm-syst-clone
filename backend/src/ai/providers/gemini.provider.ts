import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  AiGenerateOptions,
  AiProvider,
} from '../interfaces/ai-provider.interface';
import {
  mapGeminiError,
  resolveGeminiModel,
} from './gemini.util';

@Injectable()
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model: string;
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenerativeAI | null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim() ?? '';
    this.model = resolveGeminiModel(this.config.get<string>('GEMINI_MODEL'));
    this.client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    if (!apiKey) {
      this.logger.warn(
        'GEMINI_API_KEY is not set — AI generation calls will fail until configured',
      );
    } else {
      this.logger.log(`Gemini model: ${this.model}`);
    }
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiGenerateOptions,
  ): Promise<string> {
    try {
      const model = this.getModel({
        temperature: options?.temperature ?? 0.3,
        systemInstruction: systemPrompt,
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text()?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty response',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Gemini error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapGeminiError(error, this.model);
    }
  }

  async generateStructuredJson<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
  ): Promise<T> {
    try {
      const model = this.getModel({
        temperature: 0.1,
        responseMimeType: 'application/json',
        systemInstruction: systemPrompt,
      });
      const schemaHint = JSON.stringify(schema);
      const fullPrompt = `${prompt}\n\nRespond with JSON only that matches this schema:\n${schemaHint}`;
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text()?.trim();
      if (!text) {
        throw new ServiceUnavailableException(
          'AI provider returned an empty JSON response',
        );
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (!match) {
          throw new ServiceUnavailableException(
            'AI provider returned invalid JSON',
          );
        }
        return JSON.parse(match[0]) as T;
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(
        `Gemini error: ${error instanceof Error ? error.message : error}`,
      );
      throw mapGeminiError(error, this.model);
    }
  }

  private getModel(generationConfig: {
    temperature?: number;
    responseMimeType?: string;
    systemInstruction?: string;
  }) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'AI provider is not configured (missing GEMINI_API_KEY)',
      );
    }
    const { systemInstruction, ...config } = generationConfig;
    return this.client.getGenerativeModel({
      model: this.model,
      generationConfig: config,
      systemInstruction: systemInstruction || undefined,
    });
  }
}
