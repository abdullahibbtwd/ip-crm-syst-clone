import {
  filingAuthorityForJurisdiction,
  filingTimelineTitle,
} from './ip-right-filing.utils';

describe('ip-right-filing.utils', () => {
  describe('filingAuthorityForJurisdiction', () => {
    it('maps known jurisdiction codes', () => {
      expect(filingAuthorityForJurisdiction('BG')).toBe('BPO');
      expect(filingAuthorityForJurisdiction('bpo')).toBe('BPO');
      expect(filingAuthorityForJurisdiction('EU')).toBe('EUIPO');
      expect(filingAuthorityForJurisdiction('EUTM')).toBe('EUIPO');
      expect(filingAuthorityForJurisdiction('EP')).toBe('EPO');
      expect(filingAuthorityForJurisdiction('WO')).toBe('WIPO');
      expect(filingAuthorityForJurisdiction('US')).toBe('USPTO');
      expect(filingAuthorityForJurisdiction('GB')).toBe('UKIPO');
    });

    it('returns the uppercased code when unknown', () => {
      expect(filingAuthorityForJurisdiction(' xx ')).toBe('XX');
    });
  });

  describe('filingTimelineTitle', () => {
    it('includes authority and application number', () => {
      expect(filingTimelineTitle('EP', 'EP1234567')).toBe(
        'Filed application with EPO. Application No: EP1234567.',
      );
    });
  });
});
