import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Default Claude model for AnthropicProvider. */
export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

export function resolveAnthropicModel(configured?: string | null): string {
  return configured?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

export function mapAnthropicError(
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

  if (status === 429 || raw.includes('429') || /rate.?limit/i.test(raw)) {
    return new HttpException(
      'The AI provider is rate-limited. Please wait a moment and try again.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (
    status === 401 ||
    raw.includes('401') ||
    /invalid.?api.?key|authentication|unauthorized/i.test(raw)
  ) {
    return new ServiceUnavailableException(
      'Anthropic API key is invalid. Check ANTHROPIC_API_KEY in .env.',
    );
  }

  if (
    status === 404 ||
    (raw.includes('404') && /model/i.test(raw)) ||
    /not_found_error/i.test(raw)
  ) {
    return new ServiceUnavailableException(
      `Anthropic model "${modelName}" is not available. ` +
        `Set ANTHROPIC_MODEL=${DEFAULT_ANTHROPIC_MODEL} in .env.`,
    );
  }

  return new ServiceUnavailableException(
    'The AI provider is temporarily unavailable. Please try again shortly.',
  );
}
