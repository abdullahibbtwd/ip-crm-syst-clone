import type { ClientOffice, ClientType } from '../../generated/prisma/client';
import { clientDisplayName } from '../crm/crm.utils';

export type DocumentMergeContext = Record<string, string>;

/** Known merge placeholders for letter templates ({{fieldName}}). */
export const DOCUMENT_MERGE_FIELD_KEYS = [
  'firmName',
  'firmAddressLine1',
  'firmAddressLine2',
  'firmWebsite',
  'firmPhone',
  'firmEmail',
  'letterDate',
  'clientName',
  'clientAddress',
  'matterTitle',
  'matterType',
  'referenceLine',
  'applicationNumber',
  'registrationNumber',
  'filingDate',
  'jurisdiction',
  'ipRightTitle',
  'attorneyName',
  'attorneyTitle',
] as const;

export type DocumentMergeFieldKey = (typeof DOCUMENT_MERGE_FIELD_KEYS)[number];

export function extractMergeFieldKeys(template: string): string[] {
  const keys = new Set<string>();
  for (const match of template.matchAll(/\{\{(\w+)\}\}/g)) {
    keys.add(match[1]!);
  }
  return [...keys];
}

export function findUnknownMergeFields(template: string): string[] {
  const allowed = new Set<string>(DOCUMENT_MERGE_FIELD_KEYS);
  return extractMergeFieldKeys(template).filter((k) => !allowed.has(k));
}

export function sampleDocumentMergeContext(): DocumentMergeContext {
  return {
    firmName: 'IP Consulting',
    firmAddressLine1: '76A James Bourchier Blvd.',
    firmAddressLine2: '1407 Sofia, Bulgaria',
    firmWebsite: 'www.ipconsulting.eu',
    firmPhone: '+359 2 123 4567',
    firmEmail: 'office@ipconsulting.eu',
    letterDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    clientName: 'Acme Holdings Ltd',
    clientAddress: '1 Example Street\nSofia\nBulgaria',
    matterTitle: 'Sample Trademark Matter',
    matterType: 'trademark',
    referenceLine: 'Our ref: CL-2026-001 / Sample Trademark Matter',
    applicationNumber: 'EU-012345678',
    registrationNumber: '—',
    filingDate: '2026-01-15',
    jurisdiction: 'EU',
    ipRightTitle: 'ACME Mark',
    attorneyName: 'Jane Attorney',
    attorneyTitle: 'European Trademark & Patent Attorney',
  };
}

const FIRM_NAME = process.env.INVOICE_FIRM_NAME?.trim() || 'IP Consulting';
const FIRM_WEBSITE =
  process.env.FIRM_WEBSITE?.trim() || 'www.ipconsulting.eu';
const FIRM_PHONE = process.env.FIRM_PHONE?.trim() || '+359 2 123 4567';
const FIRM_EMAIL = process.env.FIRM_EMAIL?.trim() || 'office@ipconsulting.eu';
const FIRM_ADDRESS_LINE1 =
  process.env.FIRM_ADDRESS_LINE1?.trim() || '76A James Bourchier Blvd.';
const FIRM_ADDRESS_LINE2 =
  process.env.FIRM_ADDRESS_LINE2?.trim() || '1407 Sofia, Bulgaria';
const ATTORNEY_TITLE =
  process.env.FIRM_ATTORNEY_TITLE?.trim() ||
  'European Trademark & Patent Attorney';

type MatterForMerge = {
  title: string;
  matterType: string;
  client: {
    type: ClientType;
    companyName: string | null;
    firstName: string | null;
    lastName: string | null;
    country: string | null;
    offices: ClientOffice[];
  };
  assignedTo: { fullName: string } | null;
  jurisdictions: Array<{ countryCode: string; localRefNumber: string | null }>;
  ipRights: Array<{
    applicationNumber: string | null;
    registrationNumber: string | null;
    filingDate: Date | null;
    jurisdiction: string;
    title: string;
  }>;
};

function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  return value.toISOString().slice(0, 10);
}

function formatOfficeAddress(
  office: ClientOffice | undefined,
  fallbackCountry?: string | null,
): string {
  if (!office) {
    return fallbackCountry ? fallbackCountry : '—';
  }
  const lines = [
    office.addressLine1,
    office.addressLine2,
    [office.postalCode, office.city].filter(Boolean).join(' '),
    office.country,
  ].filter((line) => line?.trim());
  return lines.join('\n') || fallbackCountry || '—';
}

function registeredLegalOffice(offices: ClientOffice[]): ClientOffice | undefined {
  return (
    offices.find(
      (office) => office.addressType === 'registered_legal',
    ) ??
    offices.find((office) => office.isPrimary) ??
    offices[0]
  );
}

export function buildDocumentMergeContext(
  matter: MatterForMerge,
): DocumentMergeContext {
  const ip = matter.ipRights[0];
  const jurisdiction =
    ip?.jurisdiction ??
    (matter.jurisdictions.map((j) => j.countryCode).join(', ') || '—');
  const office = registeredLegalOffice(matter.client.offices);
  const clientName = clientDisplayName(matter.client);
  const attorneyName = matter.assignedTo?.fullName ?? FIRM_NAME;

  return {
    firmName: FIRM_NAME,
    firmAddressLine1: FIRM_ADDRESS_LINE1,
    firmAddressLine2: FIRM_ADDRESS_LINE2,
    firmWebsite: FIRM_WEBSITE,
    firmPhone: FIRM_PHONE,
    firmEmail: FIRM_EMAIL,
    letterDate: new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    clientName,
    clientAddress: formatOfficeAddress(office, matter.client.country),
    matterTitle: matter.title,
    matterType: matter.matterType.replace(/_/g, ' '),
    referenceLine: '',
    applicationNumber:
      ip?.applicationNumber ?? matter.jurisdictions[0]?.localRefNumber ?? '—',
    registrationNumber: ip?.registrationNumber ?? '—',
    filingDate: formatDate(ip?.filingDate),
    jurisdiction,
    ipRightTitle: ip?.title ?? matter.title,
    attorneyName,
    attorneyTitle: ATTORNEY_TITLE,
  };
}

export function applyMergeFields(
  template: string,
  fields: DocumentMergeContext,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = fields[key];
    return value != null ? escapeHtml(value) : '';
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
