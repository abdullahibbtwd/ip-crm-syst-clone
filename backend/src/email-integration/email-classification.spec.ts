import { DocumentCategory } from '../../generated/prisma/client';
import {
  classifyIncomingEmail,
  extractClientRef,
} from './email-classification';

describe('email-classification', () => {
  describe('classifyIncomingEmail', () => {
    it('returns nulls for empty content', () => {
      expect(classifyIncomingEmail('', '')).toEqual({
        suggestedCategory: null,
        classificationReason: null,
      });
    });

    it('classifies office actions from subject keywords', () => {
      expect(classifyIncomingEmail('Office Action - refusal notice')).toEqual({
        suggestedCategory: DocumentCategory.office_action,
        classificationReason: 'keyword_office_action',
      });
    });

    it('classifies renewals from body keywords', () => {
      expect(
        classifyIncomingEmail('Notice', 'Your registration fee due soon'),
      ).toEqual({
        suggestedCategory: DocumentCategory.renewal,
        classificationReason: 'keyword_renewal',
      });
    });

    it('prefers office_action when both could match', () => {
      // office_action rules are listed first
      expect(
        classifyIncomingEmail('Examination report and renewal fee due'),
      ).toEqual({
        suggestedCategory: DocumentCategory.office_action,
        classificationReason: 'keyword_office_action',
      });
    });

    it('returns null when no rules match', () => {
      expect(classifyIncomingEmail('Weekly status update')).toEqual({
        suggestedCategory: null,
        classificationReason: null,
      });
    });
  });

  describe('extractClientRef', () => {
    it('extracts CL-YYYY-NNN from subject', () => {
      expect(extractClientRef('Re: CL-2026-042 matter')).toBe('CL-2026-042');
    });

    it('falls back to body when subject has none', () => {
      expect(extractClientRef('Hello', 'Ref cl-2025-001 please')).toBe(
        'CL-2025-001',
      );
    });

    it('returns null when absent', () => {
      expect(extractClientRef('No ref here', 'still none')).toBeNull();
    });
  });
});
