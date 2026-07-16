import { MatterType } from '../../generated/prisma/client';
import {
  computeRenewalDates,
  getRenewalCycleConfig,
  resolveRenewalJurisdiction,
  supportsAutomaticRenewalCycle,
} from './renewal-cycle.config';

describe('renewal-cycle.config', () => {
  describe('resolveRenewalJurisdiction', () => {
    it('maps EU-like codes for trademark/design', () => {
      expect(resolveRenewalJurisdiction('EU', MatterType.trademark)).toBe('EU');
      expect(resolveRenewalJurisdiction('EM', MatterType.industrial_design)).toBe(
        'EU',
      );
      expect(resolveRenewalJurisdiction('WIPO', MatterType.patent)).toBeNull();
    });

    it('maps EP/EPO for patent-like and trademark', () => {
      expect(resolveRenewalJurisdiction('EP', MatterType.patent)).toBe('EP');
      expect(resolveRenewalJurisdiction('EPO', MatterType.utility_model)).toBe(
        'EP',
      );
      expect(resolveRenewalJurisdiction('EP', MatterType.trademark)).toBe('EP');
      expect(
        resolveRenewalJurisdiction('EP', MatterType.industrial_design),
      ).toBeNull();
    });

    it('maps BG/BPO to BG for any matter type', () => {
      expect(resolveRenewalJurisdiction('BG', MatterType.trademark)).toBe('BG');
      expect(resolveRenewalJurisdiction('bpo', MatterType.patent)).toBe('BG');
    });

    it('returns null for unknown codes', () => {
      expect(resolveRenewalJurisdiction('US', MatterType.trademark)).toBeNull();
    });
  });

  describe('getRenewalCycleConfig', () => {
    it('returns trademark EU 10-year term', () => {
      expect(getRenewalCycleConfig(MatterType.trademark, 'EU')).toEqual({
        termYears: 10,
        graceMonthsAfterDue: 6,
      });
    });

    it('returns patent EP yearly annuity', () => {
      expect(getRenewalCycleConfig(MatterType.patent, 'EP')).toEqual({
        termYears: 1,
        graceMonthsAfterDue: 6,
      });
    });

    it('returns null when unsupported', () => {
      expect(getRenewalCycleConfig(MatterType.copyright, 'EU')).toBeNull();
      expect(getRenewalCycleConfig(MatterType.patent, 'US')).toBeNull();
    });
  });

  describe('computeRenewalDates', () => {
    it('computes first cycle due and grace dates', () => {
      const result = computeRenewalDates({
        matterType: MatterType.trademark,
        jurisdiction: 'EU',
        registrationDate: new Date(2020, 0, 15),
      });

      expect(result).not.toBeNull();
      expect(result!.termYears).toBe(10);
      expect(result!.jurisdiction).toBe('EU');
      expect(result!.dueDate.getFullYear()).toBe(2030);
      expect(result!.dueDate.getMonth()).toBe(0);
      expect(result!.dueDate.getDate()).toBe(15);
      expect(result!.graceDate!.getFullYear()).toBe(2030);
      expect(result!.graceDate!.getMonth()).toBe(6);
      expect(result!.graceDate!.getDate()).toBe(15);
    });

    it('scales by cycle number for patents', () => {
      const result = computeRenewalDates({
        matterType: MatterType.patent,
        jurisdiction: 'EP',
        registrationDate: new Date(2024, 5, 1),
        cycleNumber: 3,
      });

      expect(result!.dueDate.getFullYear()).toBe(2027);
      expect(result!.dueDate.getMonth()).toBe(5);
      expect(result!.dueDate.getDate()).toBe(1);
    });

    it('returns null when config is missing', () => {
      expect(
        computeRenewalDates({
          matterType: MatterType.copyright,
          jurisdiction: 'EU',
          registrationDate: new Date(2020, 0, 1),
        }),
      ).toBeNull();
    });
  });

  describe('supportsAutomaticRenewalCycle', () => {
    it('is true when a cycle config exists', () => {
      expect(supportsAutomaticRenewalCycle(MatterType.trademark, 'BG')).toBe(
        true,
      );
      expect(supportsAutomaticRenewalCycle(MatterType.valuation, 'EU')).toBe(
        false,
      );
    });
  });
});
