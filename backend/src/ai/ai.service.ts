import { Injectable } from '@nestjs/common';
import {
  AI_DRAFT_SYSTEM_PROMPT,
  AI_RULE_EXPLAIN_SYSTEM_PROMPT,
  AI_SUMMARIZE_SYSTEM_PROMPT,
} from './ai.constants';
import { AiProviderFactory } from './ai-provider.factory';
import type { AiProvider } from './interfaces/ai-provider.interface';

export type DeadlineRuleExplainInput = {
  title: string;
  dueDate: string;
  offsetDays?: number | null;
  triggerType?: string | null;
  jurisdiction?: string | null;
  ruleDescription?: string | null;
  context?: string;
};

@Injectable()
export class AiService {
  private readonly provider: AiProvider;

  constructor(factory: AiProviderFactory) {
    this.provider = factory.create();
  }

  getProviderMeta() {
    return { name: this.provider.name, model: this.provider.model };
  }

  async summarizeText(text: string, maxBullets = 3): Promise<string> {
    const clipped = text.trim().slice(0, 12_000);
    const prompt = [
      `Summarise the following email or correspondence for an IP attorney.`,
      `Return exactly ${maxBullets} short bullet points (use "- " prefix).`,
      `Focus on: what is requested, any deadlines or dates, and next actions.`,
      '',
      '---',
      clipped,
    ].join('\n');

    return this.provider.generateText(prompt, AI_SUMMARIZE_SYSTEM_PROMPT, {
      temperature: 0.2,
    });
  }

  async explainRule(rule: DeadlineRuleExplainInput): Promise<string> {
    const prompt = [
      'Explain this IP deadline in plain English for a busy attorney.',
      `Deadline title: ${rule.title}`,
      `Due on: ${rule.dueDate}`,
      rule.offsetDays != null ? `Rule offset: ${rule.offsetDays} days` : null,
      rule.triggerType ? `Trigger: ${rule.triggerType}` : null,
      rule.jurisdiction ? `Jurisdiction: ${rule.jurisdiction}` : null,
      rule.ruleDescription ? `Rule description: ${rule.ruleDescription}` : null,
      rule.context ? `Additional context: ${rule.context}` : null,
      'Keep it to 2 sentences.',
    ]
      .filter(Boolean)
      .join('\n');

    return this.provider.generateText(prompt, AI_RULE_EXPLAIN_SYSTEM_PROMPT, {
      temperature: 0.2,
    });
  }

  async generateDraft(
    incomingBody: string,
    matterContext: string,
  ): Promise<string> {
    const prompt = [
      'Draft a professional email reply to the following client query.',
      `Query:\n${incomingBody.trim().slice(0, 8_000)}`,
      '',
      `Context:\n${matterContext.trim().slice(0, 2_000)}`,
      '',
      'Keep it concise, polite, and actionable. Do not include a subject line.',
    ].join('\n');

    return this.provider.generateText(prompt, AI_DRAFT_SYSTEM_PROMPT, {
      temperature: 0.4,
    });
  }

  async generateText(
    prompt: string,
    systemPrompt?: string,
    options?: { temperature?: number },
  ): Promise<string> {
    return this.provider.generateText(prompt, systemPrompt, options);
  }

  async generateStructuredJson<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
  ): Promise<T> {
    return this.provider.generateStructuredJson<T>(
      prompt,
      schema,
      systemPrompt,
    );
  }
}
