import { MatterType } from '../../generated/prisma/client';

/** EU member states — EUIPO route for TM / design. */
const EU_MEMBER_STATES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

/** EPC contracting states — European patent route. */
const EP_CONTRACTING_STATES = new Set([
  'AL',
  'AT',
  'BA',
  'BE',
  'BG',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MK',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'RS',
  'SE',
  'SI',
  'SK',
  'SM',
  'TR',
]);

/**
 * Map an intake / matter country code to deadline-rule jurisdictions (EU, EP, BG, …).
 * Intake forms store ISO country codes; seeded rules are keyed by filing authority.
 */
export function deadlineRuleJurisdictions(
  countryCode: string,
  matterType: MatterType,
): string[] {
  const code = countryCode.trim().toUpperCase();
  if (!code) return [];

  const authorities = new Set<string>();

  if (code === 'EU' || code === 'EUTM') {
    authorities.add('EU');
  }
  if (code === 'EP') {
    authorities.add('EP');
  }

  const isTrademarkLike =
    matterType === MatterType.trademark ||
    matterType === MatterType.industrial_design;
  const isPatentLike =
    matterType === MatterType.patent || matterType === MatterType.utility_model;

  if (isTrademarkLike) {
    // National BPO route for Bulgaria; EUIPO for other EU member states.
    if (code === 'BG') {
      authorities.add('BG');
    } else if (EU_MEMBER_STATES.has(code)) {
      authorities.add('EU');
    }
  }

  if (isPatentLike) {
    // Bulgaria intake → national BPO prosecution only (not EPO).
    // Other EPC states → European patent route.
    if (code === 'BG') {
      authorities.add('BG');
    } else if (EP_CONTRACTING_STATES.has(code)) {
      authorities.add('EP');
    }
  }

  return [...authorities];
}

export function expandDeadlineRuleJurisdictions(
  countryCodes: string[],
  matterType: MatterType,
): string[] {
  const expanded = new Set<string>();
  for (const countryCode of countryCodes) {
    for (const authority of deadlineRuleJurisdictions(
      countryCode,
      matterType,
    )) {
      expanded.add(authority);
    }
  }
  return [...expanded];
}
