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
  [IntakeMatterType.other]: 'Other',
};

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
    case IntakeMatterType.other:
    default:
      return MatterType.dispute_opposition;
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
