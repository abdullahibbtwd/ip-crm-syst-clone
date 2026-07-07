import type { MatterType } from '../../generated/prisma/client';

export type RenewalCycleConfig = {
  termYears: number;
  /** Calendar months after registration when the first renewal is due (optional override). */
  graceMonthsAfterDue?: number;
};

/** Jurisdiction authority codes used in deadline_rules (EU, EP, BG). */
export type RenewalJurisdiction = 'EU' | 'EP' | 'BG';

const DEFAULT_GRACE_MONTHS = 6;

/**
 * Renewal term length by matter type and rule jurisdiction.
 * Patent annuities are deferred - use manual renewal windows until schedules ship.
 */
const RENEWAL_CYCLES: Partial<
  Record<MatterType, Partial<Record<RenewalJurisdiction, RenewalCycleConfig>>>
> = {
  trademark: {
    EU: { termYears: 10, graceMonthsAfterDue: DEFAULT_GRACE_MONTHS },
    BG: { termYears: 10, graceMonthsAfterDue: DEFAULT_GRACE_MONTHS },
    EP: { termYears: 10, graceMonthsAfterDue: DEFAULT_GRACE_MONTHS },
  },
  industrial_design: {
    EU: { termYears: 5, graceMonthsAfterDue: DEFAULT_GRACE_MONTHS },
    BG: { termYears: 5, graceMonthsAfterDue: DEFAULT_GRACE_MONTHS },
  },
};

export type RenewalCycleResult = {
  termYears: number;
  anchorDate: Date;
  dueDate: Date;
  graceDate: Date | null;
  jurisdiction: RenewalJurisdiction | null;
};

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Map ISO country / matter jurisdiction codes to renewal rule jurisdictions. */
export function resolveRenewalJurisdiction(
  jurisdiction: string,
  matterType: MatterType,
): RenewalJurisdiction | null {
  const code = jurisdiction.trim().toUpperCase();

  if (code === 'EU' || code === 'EM' || code === 'WIPO') {
    return matterType === 'trademark' || matterType === 'industrial_design'
      ? 'EU'
      : null;
  }

  if (code === 'EP' || code === 'EPO') {
    return matterType === 'patent' || matterType === 'trademark' ? 'EP' : null;
  }

  if (code === 'BG' || code === 'BPO') {
    return 'BG';
  }

  return null;
}

export function getRenewalCycleConfig(
  matterType: MatterType,
  jurisdiction: string,
): RenewalCycleConfig | null {
  const ruleJurisdiction = resolveRenewalJurisdiction(jurisdiction, matterType);
  if (!ruleJurisdiction) return null;

  return RENEWAL_CYCLES[matterType]?.[ruleJurisdiction] ?? null;
}

/**
 * Compute the first (or next) renewal due date from a registration anchor.
 */
export function computeRenewalDates(params: {
  matterType: MatterType;
  jurisdiction: string;
  registrationDate: Date;
  cycleNumber?: number;
}): RenewalCycleResult | null {
  const config = getRenewalCycleConfig(params.matterType, params.jurisdiction);
  if (!config) return null;

  const ruleJurisdiction = resolveRenewalJurisdiction(
    params.jurisdiction,
    params.matterType,
  );
  if (!ruleJurisdiction) return null;

  const anchor = startOfDay(params.registrationDate);
  const cycle = params.cycleNumber ?? 1;
  const dueDate = addYears(anchor, config.termYears * cycle);

  const graceMonths = config.graceMonthsAfterDue ?? DEFAULT_GRACE_MONTHS;
  const graceDate = graceMonths > 0 ? addMonths(dueDate, graceMonths) : null;

  return {
    termYears: config.termYears,
    anchorDate: anchor,
    dueDate,
    graceDate,
    jurisdiction: ruleJurisdiction,
  };
}

/** Whether automatic renewal windows are supported for this IP right. */
export function supportsAutomaticRenewalCycle(
  matterType: MatterType,
  jurisdiction: string,
): boolean {
  return getRenewalCycleConfig(matterType, jurisdiction) != null;
}
