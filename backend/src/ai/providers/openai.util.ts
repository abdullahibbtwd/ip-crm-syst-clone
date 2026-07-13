import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Default chat model for OpenAiProvider. */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o';

export function resolveOpenAiModel(configured?: string | null): string {
  return configured?.trim() || DEFAULT_OPENAI_MODEL;
}

export function mapOpenAiError(
  error: unknown,
  modelName: string,
): HttpException {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
      ? (error as { status: number }).status
      : undefined;

  const raw =
    error instanceof Error ? error.message : 'AI provider request failed';

  if (status === 429 || raw.includes('429') || /rate limit/i.test(raw)) {
    return new HttpException(
      'The AI provider is rate-limited. Please wait a moment and try again.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (
    status === 401 ||
    raw.includes('401') ||
    /incorrect api key|invalid api key|authentication/i.test(raw)
  ) {
    return new ServiceUnavailableException(
      'OpenAI API key is invalid. Check OPENAI_API_KEY in .env.',
    );
  }

  if (status === 404 || (raw.includes('404') && /model/i.test(raw))) {
    return new ServiceUnavailableException(
      `OpenAI model "${modelName}" is not available. ` +
        `Set OPENAI_MODEL=${DEFAULT_OPENAI_MODEL} in .env.`,
    );
  }

  return new ServiceUnavailableException(
    'The AI provider is temporarily unavailable. Please try again shortly.',
  );
}
