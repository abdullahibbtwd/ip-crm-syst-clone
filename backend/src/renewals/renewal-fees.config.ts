import type { MatterType } from '../../generated/prisma/client';

export type RenewalFeeDefaults = {
  officialFee: number;
  serviceFee: number;
  currency: string;
};

const DEFAULT_FEES: RenewalFeeDefaults = {
  officialFee: 0,
  serviceFee: 150,
  currency: 'EUR',
};

const FEE_TABLE: Partial<
  Record<MatterType, Partial<Record<string, RenewalFeeDefaults>>>
> = {
  trademark: {
    EU: { officialFee: 850, serviceFee: 200, currency: 'EUR' },
    BG: { officialFee: 320, serviceFee: 180, currency: 'EUR' },
  },
  industrial_design: {
    EU: { officialFee: 350, serviceFee: 180, currency: 'EUR' },
    BG: { officialFee: 200, serviceFee: 150, currency: 'EUR' },
  },
};

export function getDefaultRenewalFees(
  matterType: MatterType,
  jurisdiction: string,
): RenewalFeeDefaults {
  const code = jurisdiction.trim().toUpperCase();
  const byType = FEE_TABLE[matterType];
  if (!byType) return DEFAULT_FEES;
  return byType[code] ?? byType.EU ?? byType.BG ?? DEFAULT_FEES;
}
