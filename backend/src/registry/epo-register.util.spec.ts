import {
  epoRegisterUrl,
  epoRegisterUrlFromParts,
  normalizeEpoAppNumber,
} from './epo-register.util';

describe('epo-register.util', () => {
  describe('normalizeEpoAppNumber', () => {
    it('uppercases and strips spaces', () => {
      expect(normalizeEpoAppNumber('  ep 1234567 ')).toBe('EP1234567');
    });

    it('folds dotted check digit into the number', () => {
      expect(normalizeEpoAppNumber('EP23717053.1')).toBe('EP237170531');
    });

    it('prefixes bare digits with EP', () => {
      expect(normalizeEpoAppNumber('237170531')).toBe('EP237170531');
    });

    it('strips kind-code suffixes', () => {
      expect(normalizeEpoAppNumber('EP1234567A1')).toBe('EP1234567');
    });
  });

  describe('epoRegisterUrl', () => {
    it('builds a smartSearch URL with normalized EP query', () => {
      expect(epoRegisterUrl('EP23717053.1')).toBe(
        'https://register.epo.org/smartSearch?lng=en&query=EP237170531',
      );
    });

    it('prefixes bare digit numbers with EP', () => {
      expect(epoRegisterUrl('1234567')).toContain('query=EP1234567');
    });

    it('keeps an existing EP prefix', () => {
      expect(epoRegisterUrl('EP1234567')).toContain('query=EP1234567');
    });
  });

  describe('epoRegisterUrlFromParts', () => {
    it('joins base number and check digit', () => {
      expect(epoRegisterUrlFromParts('EP23717053', '1')).toBe(
        epoRegisterUrl('EP237170531'),
      );
    });
  });
});
