export const AI_PROVIDER = Symbol('AI_PROVIDER');

export type AiGenerateOptions = {
  temperature?: number;
};

export interface AiProvider {
  readonly name: string;
  readonly model: string;

  generateText(
    prompt: string,
    systemPrompt?: string,
    options?: AiGenerateOptions,
  ): Promise<string>;

  generateStructuredJson<T>(
    prompt: string,
    schema: object,
    systemPrompt?: string,
  ): Promise<T>;
}
