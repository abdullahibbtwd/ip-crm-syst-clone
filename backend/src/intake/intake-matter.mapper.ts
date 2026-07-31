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
  [IntakeMatterType.design]: 'Design',
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
    IntakeMatterType.design,
    IntakeMatterType.domain,
  ]);

export function mapIntakeMatterType(type: IntakeMatterType): MatterType {
  switch (type) {
    case IntakeMatterType.trademark:
      return MatterType.trademark;
    case IntakeMatterType.patent:
      return MatterType.patent;
    case IntakeMatterType.utility_model:
      return MatterType.utility_model;
    case IntakeMatterType.design:
      return MatterType.industrial_design;
    case IntakeMatterType.cases:
      return MatterType.cases;
    case IntakeMatterType.domain:
      return MatterType.domain;
    case IntakeMatterType.litigation_expert_report:
      return MatterType.litigation_expert_report;
    case IntakeMatterType.consultation:
      return MatterType.consultation;
    case IntakeMatterType.official_fee_payment:
      return MatterType.official_fee_payment;
    case IntakeMatterType.other:
    default:
      return MatterType.other;
  }
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
