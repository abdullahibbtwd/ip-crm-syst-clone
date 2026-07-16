import { MatterType } from '../../generated/prisma/client';
import {
  deadlineRuleJurisdictions,
  expandDeadlineRuleJurisdictions,
} from './deadline-jurisdiction.utils';

describe('deadline-jurisdiction.utils', () => {
  describe('deadlineRuleJurisdictions', () => {
    it('returns empty for blank country code', () => {
      expect(deadlineRuleJurisdictions('  ', MatterType.trademark)).toEqual([]);
    });

    it('maps EU / EUTM codes to EU', () => {
      expect(deadlineRuleJurisdictions('EU', MatterType.trademark)).toEqual([
        'EU',
      ]);
      expect(deadlineRuleJurisdictions('eutm', MatterType.trademark)).toEqual([
        'EU',
      ]);
    });

    it('maps EP code to EP', () => {
      expect(deadlineRuleJurisdictions('EP', MatterType.patent)).toEqual(['EP']);
    });

    it('routes trademark BG to national BPO', () => {
      expect(deadlineRuleJurisdictions('BG', MatterType.trademark)).toEqual([
        'BG',
      ]);
    });

    it('routes trademark EU member states to EU', () => {
      expect(deadlineRuleJurisdictions('DE', MatterType.trademark)).toEqual([
        'EU',
      ]);
      expect(
        deadlineRuleJurisdictions('FR', MatterType.industrial_design),
      ).toEqual(['EU']);
    });

    it('routes patent BG to national BPO only', () => {
      expect(deadlineRuleJurisdictions('BG', MatterType.patent)).toEqual([
        'BG',
      ]);
    });

    it('routes patent EPC states to EP', () => {
      expect(deadlineRuleJurisdictions('DE', MatterType.patent)).toEqual([
        'EP',
      ]);
      expect(deadlineRuleJurisdictions('GB', MatterType.utility_model)).toEqual([
        'EP',
      ]);
    });

    it('does not add EU/EP for non-matching matter types', () => {
      expect(deadlineRuleJurisdictions('US', MatterType.trademark)).toEqual([]);
      expect(deadlineRuleJurisdictions('US', MatterType.patent)).toEqual([]);
    });
  });

  describe('expandDeadlineRuleJurisdictions', () => {
    it('deduplicates authorities across countries', () => {
      const result = expandDeadlineRuleJurisdictions(
        ['DE', 'FR', 'BG'],
        MatterType.trademark,
      );
      expect(result.sort()).toEqual(['BG', 'EU']);
    });
  });
});
