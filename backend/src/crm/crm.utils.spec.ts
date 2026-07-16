import { clientDisplayName } from './crm.utils';

describe('crm.utils', () => {
  describe('clientDisplayName', () => {
    it('uses companyName for company clients', () => {
      expect(
        clientDisplayName({
          type: 'company',
          companyName: 'Acme IP Ltd',
          firstName: null,
          lastName: null,
        }),
      ).toBe('Acme IP Ltd');
    });

    it('falls back to person name when company has no companyName', () => {
      expect(
        clientDisplayName({
          type: 'company',
          companyName: null,
          firstName: 'Ada',
          lastName: 'Lovelace',
        }),
      ).toBe('Ada Lovelace');
    });

    it('joins individual names', () => {
      expect(
        clientDisplayName({
          type: 'individual',
          companyName: null,
          firstName: 'Grace',
          lastName: 'Hopper',
        }),
      ).toBe('Grace Hopper');
    });

    it('returns Unnamed client when empty', () => {
      expect(
        clientDisplayName({
          type: 'individual',
          companyName: null,
          firstName: null,
          lastName: null,
        }),
      ).toBe('Unnamed client');
    });
  });
});
