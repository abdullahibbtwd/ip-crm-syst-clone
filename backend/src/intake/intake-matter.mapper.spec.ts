import {
  IntakeEnquirerType,
  IntakeMatterType,
  MatterType,
} from '../../generated/prisma/client';
import {
  buildMatterAttributesFromIntake,
  buildMatterTitle,
  intakeEnquirerDisplayName,
  mapIntakeMatterType,
} from './intake-matter.mapper';

describe('intake-matter.mapper', () => {
  describe('mapIntakeMatterType', () => {
    it('maps known intake types to matter types', () => {
      expect(mapIntakeMatterType(IntakeMatterType.trademark)).toBe(
        MatterType.trademark,
      );
      expect(mapIntakeMatterType(IntakeMatterType.patent)).toBe(
        MatterType.patent,
      );
      expect(mapIntakeMatterType(IntakeMatterType.utility_model)).toBe(
        MatterType.utility_model,
      );
      expect(mapIntakeMatterType(IntakeMatterType.industrial_design)).toBe(
        MatterType.industrial_design,
      );
      expect(mapIntakeMatterType(IntakeMatterType.copyright)).toBe(
        MatterType.copyright,
      );
      expect(mapIntakeMatterType(IntakeMatterType.geographical_indication)).toBe(
        MatterType.geographical_indication,
      );
      expect(mapIntakeMatterType(IntakeMatterType.border_measures)).toBe(
        MatterType.border_measures,
      );
      expect(mapIntakeMatterType(IntakeMatterType.fto_analysis)).toBe(
        MatterType.fto_analysis,
      );
      expect(mapIntakeMatterType(IntakeMatterType.valuation)).toBe(
        MatterType.valuation,
      );
      expect(mapIntakeMatterType(IntakeMatterType.dispute_opposition)).toBe(
        MatterType.dispute_opposition,
      );
      expect(mapIntakeMatterType(IntakeMatterType.cases)).toBe(MatterType.cases);
      expect(mapIntakeMatterType(IntakeMatterType.domain)).toBe(MatterType.domain);
      expect(
        mapIntakeMatterType(IntakeMatterType.litigation_expert_report),
      ).toBe(MatterType.litigation_expert_report);
      expect(mapIntakeMatterType(IntakeMatterType.consultation)).toBe(
        MatterType.consultation,
      );
      expect(mapIntakeMatterType(IntakeMatterType.official_fee_payment)).toBe(
        MatterType.official_fee_payment,
      );
      expect(mapIntakeMatterType(IntakeMatterType.other)).toBe(MatterType.other);
    });
  });

  describe('intakeEnquirerDisplayName', () => {
    it('uses company name for company enquirers', () => {
      expect(
        intakeEnquirerDisplayName({
          enquirerType: IntakeEnquirerType.company,
          companyName: '  Contoso  ',
          fullName: 'Ignored',
        }),
      ).toBe('Contoso');
    });

    it('falls back to Client when company name missing', () => {
      expect(
        intakeEnquirerDisplayName({
          enquirerType: IntakeEnquirerType.company,
          companyName: null,
          fullName: 'Ada',
        }),
      ).toBe('Client');
    });

    it('uses full name for individuals', () => {
      expect(
        intakeEnquirerDisplayName({
          enquirerType: IntakeEnquirerType.individual,
          companyName: null,
          fullName: ' Ada Lovelace ',
        }),
      ).toBe('Ada Lovelace');
    });
  });

  describe('buildMatterTitle', () => {
    it('combines enquirer and matter type label', () => {
      expect(
        buildMatterTitle({
          enquirerType: IntakeEnquirerType.company,
          companyName: 'Acme',
          fullName: null,
          matterType: IntakeMatterType.patent,
        }),
      ).toBe('Acme - Patent');
    });
  });

  describe('buildMatterAttributesFromIntake', () => {
    it('copies intake fields and counterparties', () => {
      const attrs = buildMatterAttributesFromIntake({
        id: 'lead-1',
        urgency: 'urgent',
        referralSource: 'email',
        referredBy: 'partner',
        notes: 'rush',
        counterparties: [
          {
            name: 'Rival Co',
            company: 'Rival',
            relationship: 'competitor',
            notes: null,
          },
        ],
      });

      expect(attrs).toEqual({
        sourceIntakeId: 'lead-1',
        urgency: 'urgent',
        referralSource: 'email',
        referredBy: 'partner',
        intakeNotes: 'rush',
        counterparties: [
          {
            name: 'Rival Co',
            company: 'Rival',
            relationship: 'competitor',
            notes: null,
          },
        ],
      });
    });
  });
});
