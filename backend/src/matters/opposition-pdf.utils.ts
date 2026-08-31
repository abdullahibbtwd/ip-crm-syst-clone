import { clientDisplayName } from '../crm/crm.utils';
import { readTrademarkProcedureFromAttributes } from './trademark-procedure-filter.utils';

const OPPOSITION_STAGES = [
  'disputes_division',
  'opposition_decision',
  'disputes_department_decision',
  'case',
  'stopped',
  'closed',
] as const;

type OppositionStage = (typeof OPPOSITION_STAGES)[number];

export type OppositionPdfLang = 'en' | 'bg';

export type OppositionPdfBasisMark = {
  name: string;
  territory: string;
  applicationNo: string;
  applicationDate: string;
  classes: string;
  imageDataUrl: string | null;
};

export type OppositionPdfEvent = {
  label: string;
  detail: string | null;
};

export type OppositionPdfData = {
  lang: OppositionPdfLang;
  headerTitle: string;
  markRef: string;
  subjectMark: {
    name: string;
    applicationNumber: string;
    applicationDate: string;
    markType: string;
    classes: string;
    applicant: string;
    representative: string;
    imageDataUrl: string | null;
  };
  basisMarks: OppositionPdfBasisMark[];
  againstClasses: string;
  submittedBy: string;
  events: OppositionPdfEvent[];
  generatedAt: string;
};

type MatterForOppositionPdf = {
  id: string;
  title: string;
  matterType: string;
  client: Parameters<typeof clientDisplayName>[0];
  applicantClient: Parameters<typeof clientDisplayName>[0] | null;
  attributes: { attributes: unknown } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function readNiceClasses(attrs: Record<string, unknown>): string {
  const raw = attrs.niceClasses;
  if (!Array.isArray(raw)) return '';
  return raw
    .map((c) => (typeof c === 'number' ? String(c) : String(c)))
    .filter(Boolean)
    .join(', ');
}

function readOppositionStage(attrs: Record<string, unknown>): OppositionStage | null {
  const stage = attrs.oppositionStage;
  if (
    typeof stage === 'string' &&
    (OPPOSITION_STAGES as readonly string[]).includes(stage)
  ) {
    return stage as OppositionStage;
  }
  return null;
}

function readDecisionRef(attrs: Record<string, unknown>): {
  number: string;
  date: string;
} {
  const ref = asRecord(attrs.oppositionDecisionRef);
  return {
    number:
      readString(ref?.number) ||
      readString(attrs.oppositionDecisionNumber) ||
      '—',
    date:
      readString(ref?.date) ||
      readString(attrs.oppositionDecisionDate) ||
      '—',
  };
}

function formatDisplayDate(value: string): string {
  if (!value || value === '—') return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function markTypeLabel(attrs: Record<string, unknown>): string {
  const territory = attrs.territory;
  if (territory === 'eu') return 'CTM';
  const markType = readString(attrs.markType);
  if (!markType) return '—';
  return markType.replace(/_/g, ' ');
}

function readBasisMarks(attrs: Record<string, unknown>): Array<{
  name: string;
  territory: string;
  applicationNo: string;
  applicationDate: string;
  classes: string;
  markImageDocumentId: string | null;
  markImageDocumentVersionId: string | null;
}> {
  const raw = attrs.basisMarks;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const mark = row as Record<string, unknown>;
      return {
        name: readString(mark.name) || '—',
        territory: readString(mark.country) || '—',
        applicationNo: readString(mark.applicationNo) || '—',
        applicationDate: formatDisplayDate(readString(mark.applicationDate)),
        classes: readString(mark.classes) || '—',
        markImageDocumentId: readString(mark.markImageDocumentId) || null,
        markImageDocumentVersionId:
          readString(mark.markImageDocumentVersionId) || null,
      };
    });
}

function readEvents(attrs: Record<string, unknown>, lang: OppositionPdfLang): OppositionPdfEvent[] {
  const raw = attrs.oppositionEvents;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((row) => row && typeof row === 'object' && !Array.isArray(row))
    .map((row) => {
      const event = row as Record<string, unknown>;
      const kind = readString(event.kind);
      const appealedBy = readString(event.appealedBy);
      const decisionNumber = readString(event.decisionNumber);
      const decisionDate = readString(event.decisionDate);

      let label = readString(event.label) || '—';
      if (kind === 'appeal' && appealedBy) {
        label =
          lang === 'bg'
            ? `Обжалвано от ${appealedBy}`
            : `Appealed by ${appealedBy}`;
      } else if (kind === 'court_appeal' && appealedBy) {
        label =
          lang === 'bg'
            ? `Обжалвано в съд от ${appealedBy}`
            : `Appealed in court by ${appealedBy}`;
      } else if (kind === 'decision') {
        label = lang === 'bg' ? 'Решение по опозиция' : 'Decision on opposition';
      } else if (kind === 'department_decision') {
        label =
          lang === 'bg'
            ? 'Решение на отдел спорове'
            : 'Disputes department decision';
      } else if (kind === 'second_decision') {
        label =
          lang === 'bg'
            ? 'Второ решение по опозиция'
            : 'Second decision on opposition';
      }

      const detail =
        decisionNumber && decisionNumber !== '—'
          ? `No. ${decisionNumber} / ${formatDisplayDate(decisionDate || readString(event.at))}`
          : null;

      return { label, detail };
    });
}

function buildHeaderTitle(
  attrs: Record<string, unknown>,
  stage: OppositionStage | null,
  markRef: string,
  lang: OppositionPdfLang,
): string {
  const ref = readDecisionRef(attrs);
  const number = ref.number;
  const date = formatDisplayDate(ref.date);

  if (stage === 'opposition_decision') {
    return lang === 'bg'
      ? `Решение по опозиция No. ${number} / ${date}`
      : `Decision on opposition No. ${number} / ${date}`;
  }
  if (stage === 'disputes_department_decision') {
    return lang === 'bg'
      ? `Решение на отдел спорове No. ${number} / ${date}`
      : `Disputes department decision No. ${number} / ${date}`;
  }
  if (stage === 'case') {
    const caseNumber = readString(attrs.oppositionCaseNumber) || number;
    const caseDate = formatDisplayDate(
      readString(attrs.oppositionCaseDate) || ref.date,
    );
    return lang === 'bg'
      ? `Обжалвано решение по опозиция No. ${caseNumber} / ${caseDate}`
      : `Appealed decision on opposition No. ${caseNumber} / ${caseDate}`;
  }
  if (stage === 'stopped') {
    return lang === 'bg'
      ? `${markRef} — Опозиция спряна`
      : `${markRef} — Opposition stopped`;
  }
  if (stage === 'closed') {
    return lang === 'bg'
      ? `${markRef} — Опозиция приключена`
      : `${markRef} — Opposition closed`;
  }
  if (stage === 'disputes_division') {
    return lang === 'bg'
      ? `${markRef} — Опозиция в отдел по спорове`
      : `${markRef} — Opposition in disputes division`;
  }
  return lang === 'bg' ? 'Опозиция' : 'Opposition';
}

export function isOppositionMatterForPdf(matter: MatterForOppositionPdf): boolean {
  if (matter.matterType !== 'trademark') return false;
  const procedure = readTrademarkProcedureFromAttributes(
    matter.attributes?.attributes,
  );
  if (!procedure) return false;
  return (
    procedure === 'opposition' ||
    procedure === 'opposition_against_us' ||
    procedure === 'opposition_by_us'
  );
}

export function buildOppositionPdfData(
  matter: MatterForOppositionPdf,
  lang: OppositionPdfLang,
  imageDataUrls: {
    subjectImage: string | null;
    basisImages: Array<string | null>;
  },
): OppositionPdfData {
  const attrs = asRecord(matter.attributes?.attributes) ?? {};
  const prosecution = asRecord(attrs.prosecution);
  const stage = readOppositionStage(attrs);
  const applicationNumber =
    readString(attrs.applicationNumber) ||
    readString(prosecution?.applicationNumber) ||
    '—';
  const markRef =
    applicationNumber !== '—'
      ? `${applicationNumber} ${matter.title}`.trim()
      : matter.title;

  const applicant = matter.applicantClient
    ? clientDisplayName(matter.applicantClient)
    : clientDisplayName(matter.client);

  const basisMarksRaw = readBasisMarks(attrs);

  return {
    lang,
    headerTitle: buildHeaderTitle(attrs, stage, markRef, lang),
    markRef,
    subjectMark: {
      name: matter.title,
      applicationNumber,
      applicationDate: formatDisplayDate(
        readString(attrs.applicationDate) ||
          readString(prosecution?.applicationDate),
      ),
      markType: markTypeLabel(attrs),
      classes: readNiceClasses(attrs) || '—',
      applicant,
      representative:
        readString(prosecution?.representatives) ||
        readString(attrs.mol) ||
        '—',
      imageDataUrl: imageDataUrls.subjectImage,
    },
    basisMarks: basisMarksRaw.map((mark, index) => ({
      name: mark.name,
      territory: mark.territory,
      applicationNo: mark.applicationNo,
      applicationDate: mark.applicationDate,
      classes: mark.classes,
      imageDataUrl: imageDataUrls.basisImages[index] ?? null,
    })),
    againstClasses: readString(attrs.againstClasses) || '—',
    submittedBy:
      readString(attrs.oppositionFiler) ||
      readString(attrs.requester) ||
      '—',
    events: readEvents(attrs, lang),
    generatedAt: new Date().toLocaleString(lang === 'bg' ? 'bg-BG' : 'en-GB'),
  };
}

export function oppositionPdfFileName(data: OppositionPdfData): string {
  const safeRef = data.markRef.replace(/[^\w.-]+/g, '_').slice(0, 60);
  return `opposition-${safeRef || 'matter'}.pdf`;
}
