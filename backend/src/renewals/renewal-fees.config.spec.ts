import { MatterType } from '../../generated/prisma/client';
import { getDefaultRenewalFees } from './renewal-fees.config';

describe('renewal-fees.config', () => {
  it('returns trademark EU fees', () => {
    expect(getDefaultRenewalFees(MatterType.trademark, 'EU')).toEqual({
      officialFee: 850,
      serviceFee: 200,
      currency: 'EUR',
    });
  });

  it('returns trademark BG fees', () => {
    expect(getDefaultRenewalFees(MatterType.trademark, 'bg')).toEqual({
      officialFee: 320,
      serviceFee: 180,
      currency: 'EUR',
    });
  });

  it('returns industrial design fees', () => {
    expect(getDefaultRenewalFees(MatterType.industrial_design, 'EU')).toEqual({
      officialFee: 350,
      serviceFee: 180,
      currency: 'EUR',
    });
  });

  it('falls back to defaults for unknown matter types', () => {
    expect(getDefaultRenewalFees(MatterType.patent, 'EP')).toEqual({
      officialFee: 0,
      serviceFee: 150,
      currency: 'EUR',
    });
  });

  it('falls back within type when jurisdiction missing', () => {
    // trademark has EU and BG; unknown code falls back to EU then BG
    expect(getDefaultRenewalFees(MatterType.trademark, 'XX')).toEqual({
      officialFee: 850,
      serviceFee: 200,
      currency: 'EUR',
    });
  });
});
