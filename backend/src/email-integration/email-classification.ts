import { DocumentCategory } from '../../generated/prisma/client';

export type EmailClassification = {
  suggestedCategory: DocumentCategory | null;
  classificationReason: string | null;
};

/** Keyword rules (AI-lite). First matching group wins. */
const CATEGORY_RULES: Array<{
  category: DocumentCategory;
  reason: string;
  patterns: RegExp[];
}> = [
  {
    category: DocumentCategory.office_action,
    reason: 'keyword_office_action',
    patterns: [
      /\bexamination\s+report\b/i,
      /\boffice\s*action\b/i,
      /\brefusal\b/i,
      /\bobjection\b/i,
      /\bopposition\b/i,
    ],
  },
  {
    category: DocumentCategory.renewal,
    reason: 'keyword_renewal',
    patterns: [/\brenewal\b/i, /\bfee\s+due\b/i, /\bexpir(?:y|ation|es|ed)\b/i],
  },
];

/**
 * Rule-based email classifier for the unlinked queue.
 * Scans subject + body; no LLM.
 */
export function classifyIncomingEmail(
  subject: string,
  bodyText?: string | null,
): EmailClassification {
  const haystack = `${subject ?? ''}\n${bodyText ?? ''}`;
  if (!haystack.trim()) {
    return { suggestedCategory: null, classificationReason: null };
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((p) => p.test(haystack))) {
      return {
        suggestedCategory: rule.category,
        classificationReason: rule.reason,
      };
    }
  }

  return { suggestedCategory: null, classificationReason: null };
}

export const CLIENT_REF_PATTERN = /\b(CL-\d{4}-\d{3})\b/i;

export function extractClientRef(
  subject: string,
  bodyText?: string | null,
): string | null {
  const fromSubject = subject?.match(CLIENT_REF_PATTERN);
  if (fromSubject?.[1]) return fromSubject[1].toUpperCase();
  const fromBody = bodyText?.match(CLIENT_REF_PATTERN);
  if (fromBody?.[1]) return fromBody[1].toUpperCase();
  return null;
}
