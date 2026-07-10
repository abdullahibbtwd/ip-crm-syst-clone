import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';

/** Default model — supports generateContent; free tier in Google AI Studio (2026). */
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export function resolveGeminiModel(configured?: string | null): string {
  return configured?.trim() || DEFAULT_GEMINI_MODEL;
}

export function mapGeminiError(
  error: unknown,
  modelName: string,
): HttpException {
  const raw =
    error instanceof Error ? error.message : 'AI provider request failed';

  if (
    raw.includes('429') ||
    raw.includes('Too Many Requests') ||
    raw.includes('quota') ||
    raw.includes('Quota exceeded')
  ) {
    const retryMatch = raw.match(/retry in ([\d.]+)s/i);
    const retrySec = retryMatch ? Math.ceil(Number(retryMatch[1])) : 30;

    const isDailyQuota =
      raw.includes('PerDay') ||
      raw.includes('limit: 0') ||
      raw.includes('FreeTier');

    if (isDailyQuota) {
      return new ServiceUnavailableException(
        'Gemini API quota is exhausted for this model. Free-tier limits reset at midnight Pacific Time. ' +
          `Try GEMINI_MODEL=${DEFAULT_GEMINI_MODEL} in .env, or check usage at https://aistudio.google.com`,
      );
    }

    return new HttpException(
      `The AI provider is rate-limited. Please wait about ${retrySec} seconds and try again.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  if (
    raw.includes('401') ||
    raw.includes('API key not valid') ||
    raw.includes('API_KEY_INVALID')
  ) {
    return new ServiceUnavailableException(
      'Gemini API key is invalid. Check GEMINI_API_KEY in .env.',
    );
  }

  if (raw.includes('404') && raw.includes('models/')) {
    return new ServiceUnavailableException(
      `Gemini model "${modelName}" is not available. ` +
        `Set GEMINI_MODEL=${DEFAULT_GEMINI_MODEL} in .env.`,
    );
  }

  return new ServiceUnavailableException(
    'The AI provider is temporarily unavailable. Please try again shortly.',
  );
}
