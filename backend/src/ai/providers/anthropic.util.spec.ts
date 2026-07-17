import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_ANTHROPIC_MODEL,
  mapAnthropicError,
  resolveAnthropicModel,
} from './anthropic.util';

describe('anthropic.util', () => {
  describe('resolveAnthropicModel', () => {
    it('returns default when unset or blank', () => {
      expect(resolveAnthropicModel()).toBe(DEFAULT_ANTHROPIC_MODEL);
      expect(resolveAnthropicModel(null)).toBe(DEFAULT_ANTHROPIC_MODEL);
    });

    it('trims configured model', () => {
      expect(resolveAnthropicModel(' claude-opus ')).toBe('claude-opus');
    });
  });

  describe('mapAnthropicError', () => {
    const model = 'claude-test';

    it('maps rate limit by numeric status', () => {
      const err = mapAnthropicError({ status: 429, message: 'slow down' }, model);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('maps rate limit by message text', () => {
      expect(mapAnthropicError(new Error('HTTP 429'), model).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(
        mapAnthropicError(new Error('rate-limit hit'), model).getStatus(),
      ).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('maps auth errors from status, code, or message', () => {
      expect(mapAnthropicError({ status: 401 }, model).message).toContain(
        'ANTHROPIC_API_KEY',
      );
      expect(
        mapAnthropicError(new Error('401 Unauthorized'), model).message,
      ).toContain('ANTHROPIC_API_KEY');
      expect(
        mapAnthropicError(new Error('invalid api key'), model).message,
      ).toContain('ANTHROPIC_API_KEY');
      expect(
        mapAnthropicError(new Error('Authentication failed'), model).message,
      ).toContain('ANTHROPIC_API_KEY');
    });

    it('maps missing model errors', () => {
      expect(
        mapAnthropicError({ status: 404, message: 'model missing' }, model)
          .message,
      ).toContain(model);
      expect(mapAnthropicError(new Error('not_found_error'), model).message).toContain(
        model,
      );
      expect(
        mapAnthropicError(new Error('404 model claude-test unavailable'), model)
          .message,
      ).toContain(model);
    });

    it('uses fallback message for non-Error values', () => {
      const err = mapAnthropicError(null, model);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('temporarily unavailable');
    });

    it('falls back to generic unavailable for unknown errors', () => {
      const err = mapAnthropicError(new Error('socket hang up'), model);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
