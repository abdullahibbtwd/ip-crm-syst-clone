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
  'legalEntityName',
  'legalEntityType',
  'mol',
  'representativeName',
  'representativeAddress',
  'poaObject',
] as const;

export const POA_OBJECT_LABELS: Record<string, { bg: string; en: string }> = {
  trademark: { bg: 'Марка', en: 'Trademark' },
  patent: { bg: 'Патент', en: 'Patent' },
  utility_model: { bg: 'Полезен модел', en: 'Utility model' },
  industrial_design: { bg: 'Промишлен дизайн', en: 'Industrial design' },
  geographical_indication: { bg: 'Географско указание', en: 'Geographical indication' },
  copyright: { bg: 'Авторско право', en: 'Copyright' },
  domain: { bg: 'Домейн', en: 'Domain' },
  cases: { bg: 'Дело', en: 'Case' },
};

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
    legalEntityName: 'Acme Holdings Ltd, EOOD',
    legalEntityType: 'EOOD',
    mol: 'Ivan Ivanov',
    representativeName: 'IP Consulting',
    representativeAddress: '76A James Bourchier Blvd., 1407 Sofia, Bulgaria',
    poaObject:
      'Марка no. EU-012345678 - ACME Mark Trademark no. EU-012345678 - ACME Mark',
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
  attributes?: { attributes?: unknown } | null;
  client: {
    type: ClientType;
    companyName: string | null;
    legalForm?: string | null;
    firstName: string | null;
    lastName: string | null;
    country: string | null;
    offices: ClientOffice[];
    holdingGroup?: { name: string } | null;
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

export function formatPoaObjectLine(
  matterType: string,
  number: string | null | undefined,
  title: string | null | undefined,
): string {
  const labels = POA_OBJECT_LABELS[matterType] ?? {
    bg: 'Обект',
    en: 'Object',
  };
  const num = number?.trim() || '—';
  const name = title?.trim() || '—';
  return `${labels.bg} no. ${num} - ${name} ${labels.en} no. ${num} - ${name}`;
}

export function applyFieldOverrides(
  fields: DocumentMergeContext,
  overrides?: Record<string, string> | null,
): DocumentMergeContext {
  if (!overrides) return fields;
  const allowed = new Set<string>(DOCUMENT_MERGE_FIELD_KEYS);
  const next = { ...fields };
  for (const [key, value] of Object.entries(overrides)) {
    if (!allowed.has(key) || typeof value !== 'string') continue;
    next[key] = value;
  }
  return next;
}

export function buildDocumentMergeContext(
  matter: MatterForMerge,
): DocumentMergeContext {
  const ip = matter.ipRights[0];
  const jurisdiction =
    ip?.jurisdiction ??
    (matter.jurisdictions.map((j) => j.countryCode).join(', ') || '—');
  const office = registeredLegalOffice(matter.client.offices);
  const attrs = asRecord(matter.attributes?.attributes);
  const clientName = clientDisplayName(matter.client);
  const attorneyName = matter.assignedTo?.fullName ?? FIRM_NAME;
  const legalEntityType = readString(matter.client.legalForm) ?? '';
  const fromCompany = [matter.client.companyName, legalEntityType]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
  const legalEntityName =
    readString(attrs?.clientLegalName) || fromCompany || clientName;
  const applicationNumber =
    ip?.applicationNumber ?? matter.jurisdictions[0]?.localRefNumber ?? '—';
  const ipRightTitle = ip?.title ?? matter.title;
  const officeAddress = formatOfficeAddress(office, matter.client.country);
  const attrAddress = formatUnknownAddress(attrs?.registeredAddress);
  const clientAddress = attrAddress ?? officeAddress;
  const representativeName =
    matter.client.holdingGroup?.name?.trim() || attorneyName;
  const representativeAddress = [FIRM_ADDRESS_LINE1, FIRM_ADDRESS_LINE2]
    .filter((line) => line.trim())
    .join(', ');

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
    clientAddress,
    matterTitle: matter.title,
    matterType: matter.matterType.replace(/_/g, ' '),
    referenceLine: '',
    applicationNumber,
    registrationNumber: ip?.registrationNumber ?? '—',
    filingDate: formatDate(ip?.filingDate),
    jurisdiction,
    ipRightTitle,
    attorneyName,
    attorneyTitle: ATTORNEY_TITLE,
    legalEntityName: legalEntityName || clientName,
    legalEntityType,
    mol: readString(attrs?.mol) ?? '',
    representativeName,
    representativeAddress,
    poaObject: formatPoaObjectLine(
      matter.matterType,
      ip?.registrationNumber ||
        ip?.applicationNumber ||
        matter.jurisdictions[0]?.localRefNumber,
      ipRightTitle,
    ),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function formatUnknownAddress(value: unknown): string | undefined {
  const address = asRecord(value);
  if (!address) return undefined;
  const street =
    readString(address.addressLine1) ?? readString(address.address);
  const cityLine = [readString(address.postalCode), readString(address.city)]
    .filter(Boolean)
    .join(' ');
  const formatted = [
    street,
    readString(address.addressLine2),
    cityLine,
    readString(address.country),
  ]
    .filter(Boolean)
    .join(', ');
  return formatted || undefined;
}
