import {
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_OPENAI_MODEL,
  mapOpenAiError,
  resolveOpenAiModel,
} from './openai.util';

describe('openai.util', () => {
  describe('resolveOpenAiModel', () => {
    it('returns default when unset or blank', () => {
      expect(resolveOpenAiModel()).toBe(DEFAULT_OPENAI_MODEL);
      expect(resolveOpenAiModel('  ')).toBe(DEFAULT_OPENAI_MODEL);
    });

    it('trims configured model', () => {
      expect(resolveOpenAiModel(' gpt-4o-mini ')).toBe('gpt-4o-mini');
    });
  });

  describe('mapOpenAiError', () => {
    const model = 'gpt-test';

    it('maps rate limit by status', () => {
      const err = mapOpenAiError({ status: 429, message: 'slow down' }, model);
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('maps rate limit by message', () => {
      const err = mapOpenAiError(new Error('429 Too Many Requests'), model);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });

    it('maps invalid api key from status or message patterns', () => {
      expect(mapOpenAiError({ status: 401 }, model).message).toContain(
        'OPENAI_API_KEY',
      );
      expect(mapOpenAiError(new Error('401 Unauthorized'), model).message).toContain(
        'OPENAI_API_KEY',
      );
      expect(
        mapOpenAiError(new Error('Incorrect API key provided'), model).message,
      ).toContain('OPENAI_API_KEY');
      expect(
        mapOpenAiError(new Error('authentication error'), model).message,
      ).toContain('OPENAI_API_KEY');
    });

    it('maps missing model', () => {
      const err = mapOpenAiError(
        new Error('404 model gpt-test not found'),
        model,
      );
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain(model);
    });

    it('falls back to generic unavailable', () => {
      const err = mapOpenAiError('network down', model);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toContain('temporarily unavailable');
    });
  });
});
