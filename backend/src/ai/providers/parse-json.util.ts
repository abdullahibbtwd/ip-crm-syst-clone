import { ServiceUnavailableException } from '@nestjs/common';

export function parseJsonFromModelText<T>(text: string): T {
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
}
