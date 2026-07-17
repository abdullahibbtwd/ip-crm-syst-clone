import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_GEMINI_MODEL,
  mapGeminiError,
  resolveGeminiModel,
} from './gemini.util';

describe('gemini.util', () => {
  describe('resolveGeminiModel', () => {
    it('returns default when unset or blank', () => {
      expect(resolveGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
      expect(resolveGeminiModel('')).toBe(DEFAULT_GEMINI_MODEL);
    });

    it('trims configured model', () => {
      expect(resolveGeminiModel(' gemini-pro ')).toBe('gemini-pro');
    });
  });

  describe('mapGeminiError', () => {
    const model = 'gemini-test';

    it('maps daily quota exhaustion', () => {
      const err = mapGeminiError(
        new Error('429 Quota exceeded for FreeTier PerDay limit: 0'),
        model,
      );
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('quota is exhausted');
    });

    it('maps transient rate limit with retry hint', () => {
      const err = mapGeminiError(
        new Error('429 Too Many Requests — retry in 12.5s'),
        model,
      );
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toContain('13');
    });

    it('maps transient rate limit without retry hint (defaults to 30s)', () => {
      const err = mapGeminiError(new Error('429 quota'), model);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.message).toContain('30');
    });

    it('maps quota keyword as rate limit when not daily tier', () => {
      const err = mapGeminiError(new Error('Quota exceeded per minute'), model);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('maps invalid api key variants', () => {
      expect(mapGeminiError(new Error('API key not valid'), model).message).toContain(
        'GEMINI_API_KEY',
      );
      expect(mapGeminiError(new Error('401 API_KEY_INVALID'), model).message).toContain(
        'GEMINI_API_KEY',
      );
    });

    it('maps missing model', () => {
      const err = mapGeminiError(
        new Error('404 models/gemini-test is not found'),
        model,
      );
      expect(err.message).toContain(model);
    });

    it('falls back to generic unavailable', () => {
      const err = mapGeminiError('unknown', model);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
