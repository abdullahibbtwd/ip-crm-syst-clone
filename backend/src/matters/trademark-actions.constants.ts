export const TRADEMARK_ACTION_KINDS = [
  'scope_correction',
  'name_address_change',
  'transfer',
  'license',
  'pledge',
  'injunction',
  'surrender',
  'limitation',
  'insolvency',
] as const;

export type TrademarkActionKind = (typeof TRADEMARK_ACTION_KINDS)[number];

export const TRADEMARK_SECONDARY_ACTION_KINDS = [
  'name_address_change',
  'transfer',
  'license',
  'pledge',
  'injunction',
  'surrender',
  'limitation',
  'insolvency',
] as const;

export type TrademarkSecondaryActionKind =
  (typeof TRADEMARK_SECONDARY_ACTION_KINDS)[number];

export const TRADEMARK_ACTION_TITLES: Record<TrademarkActionKind, string> = {
  scope_correction: 'Scope / classes corrected',
  name_address_change: 'Name & address change logged',
  transfer: 'Trademark transfer / assignment logged',
  license: 'License agreement logged',
  pledge: 'Special pledge logged',
  injunction: 'Interim measure / injunction logged',
  surrender: 'Full surrender / disclaimer logged',
  limitation: 'Application limitation logged',
  insolvency: 'Insolvency / bankruptcy entry logged',
};

export const LEGAL_BASIS_VALUES = [
  'opposition_settlement',
  'office_action_response',
  'voluntary_limitation',
  'correction_of_error',
  'other',
] as const;

export type LegalBasisValue = (typeof LEGAL_BASIS_VALUES)[number];
