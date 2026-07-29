import {
  assessBillingReadiness,
  SUPPORTED_INVOICE_CURRENCIES,
} from './client-billing.utils';
import { ClientType } from '../../../generated/prisma/client';

describe('assessBillingReadiness', () => {
  it('marks incomplete company without vat/email/address', () => {
    const result = assessBillingReadiness({
      type: ClientType.company,
      companyName: 'Acme',
      preferredCurrency: 'EUR',
    });
    expect(result.ready).toBe(false);
    expect(result.missingFields).toEqual(
      expect.arrayContaining(['billingEmail', 'billingAddress', 'vatNo']),
    );
    expect(result.billToName).toBe('Acme');
  });

  it('marks individual ready without VAT when email+address set', () => {
    const result = assessBillingReadiness({
      type: ClientType.individual,
      firstName: 'Ada',
      lastName: 'Lovelace',
      billingEmail: 'ada@example.com',
      billingAddressLine1: '1 Street',
      billingCity: 'Sofia',
      billingCountry: 'BG',
      preferredCurrency: 'USD',
      paymentTermsDays: 14,
    });
    expect(result.ready).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.preferredCurrency).toBe('USD');
    expect(result.paymentTermsDays).toBe(14);
    expect(SUPPORTED_INVOICE_CURRENCIES).toContain('USD');
  });
});
