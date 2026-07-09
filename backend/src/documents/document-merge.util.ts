import type { ClientOffice, ClientType } from '../../generated/prisma/client';
import { clientDisplayName } from '../crm/crm.utils';

export type DocumentMergeContext = Record<string, string>;

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

function primaryOffice(offices: ClientOffice[]): ClientOffice | undefined {
  return offices.find((o) => o.isPrimary) ?? offices[0];
}

export function buildDocumentMergeContext(
  matter: MatterForMerge,
): DocumentMergeContext {
  const ip = matter.ipRights[0];
  const jurisdiction =
    ip?.jurisdiction ??
    (matter.jurisdictions.map((j) => j.countryCode).join(', ') || '—');
  const office = primaryOffice(matter.client.offices);
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
