import {
  IntakeEnquirerType,
  IntakeMatterType,
  MatterType,
  type Counterparty,
  type IntakeLead,
} from '../../generated/prisma/client';

const INTAKE_MATTER_TYPE_LABELS: Record<IntakeMatterType, string> = {
  [IntakeMatterType.trademark]: 'Trademark',
  [IntakeMatterType.patent]: 'Patent',
  [IntakeMatterType.utility_model]: 'Utility model',
  [IntakeMatterType.industrial_design]: 'Industrial design',
  [IntakeMatterType.copyright]: 'Copyright',
  [IntakeMatterType.geographical_indication]: 'Geographical indication',
  [IntakeMatterType.border_measures]: 'Border measures',
  [IntakeMatterType.fto_analysis]: 'FTO analysis',
  [IntakeMatterType.valuation]: 'Valuation',
  [IntakeMatterType.dispute_opposition]: 'Dispute / opposition',
  [IntakeMatterType.cases]: 'Cases',
  [IntakeMatterType.domain]: 'Domains',
  [IntakeMatterType.litigation_expert_report]: 'Litigation / Court Expert Reports',
  [IntakeMatterType.consultation]: 'Consultations',
  [IntakeMatterType.official_fee_payment]: 'Official Fee Payments',
  [IntakeMatterType.other]: 'Other',
};

/** Matter types that get a draft IP-right row on intake convert when a country is set. */
export const INTAKE_TYPES_WITH_DRAFT_IP_RIGHT: ReadonlySet<IntakeMatterType> =
  new Set([
    IntakeMatterType.trademark,
    IntakeMatterType.patent,
    IntakeMatterType.utility_model,
    IntakeMatterType.industrial_design,
    IntakeMatterType.domain,
  ]);

/** Intake and matter work types are now the same set — map 1:1. */
export function mapIntakeMatterType(type: IntakeMatterType): MatterType {
  return type as unknown as MatterType;
}

export function intakeEnquirerDisplayName(
  lead: Pick<IntakeLead, 'enquirerType' | 'companyName' | 'fullName'>,
): string {
  if (lead.enquirerType === IntakeEnquirerType.company) {
    return lead.companyName?.trim() || 'Client';
  }
  return lead.fullName?.trim() || 'Client';
}

export function buildMatterTitle(
  lead: Pick<
    IntakeLead,
    'enquirerType' | 'companyName' | 'fullName' | 'matterType'
  >,
): string {
  const enquirer = intakeEnquirerDisplayName(lead);
  const typeLabel = INTAKE_MATTER_TYPE_LABELS[lead.matterType];
  return `${enquirer} - ${typeLabel}`;
}

export function buildMatterAttributesFromIntake(
  lead: Pick<
    IntakeLead,
    'id' | 'urgency' | 'referralSource' | 'referredBy' | 'notes'
  > & {
    counterparties: Pick<
      Counterparty,
      'name' | 'company' | 'relationship' | 'notes'
    >[];
  },
): Record<string, unknown> {
  return {
    sourceIntakeId: lead.id,
    urgency: lead.urgency,
    referralSource: lead.referralSource,
    referredBy: lead.referredBy,
    intakeNotes: lead.notes,
    counterparties: lead.counterparties.map((cp) => ({
      name: cp.name,
      company: cp.company,
      relationship: cp.relationship,
      notes: cp.notes,
    })),
  };
}
