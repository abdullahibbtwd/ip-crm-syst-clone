import { nextId } from '@/features/create-file/create-file-form'
import type { CasePartyDraft } from '@/features/create-file/case-subtypes'
import type { CasePartyRow } from '@/features/matters/case-matter'

export function emptyCaseParty(): CasePartyDraft {
  return {
    id: nextId('party'),
    legalName: '',
    city: '',
    postalCode: '',
    country: 'BG',
    address: '',
    lawyerLegalName: '',
  }
}

export function partiesToDraft(rows: CasePartyRow[]): CasePartyDraft[] {
  if (rows.length === 0) return [emptyCaseParty()]
  return rows.map((row, index) => ({
    id: `party-${index}`,
    legalName: row.legalName ?? '',
    city: row.city ?? '',
    postalCode: row.postalCode ?? '',
    country: row.country ?? 'BG',
    address: row.address ?? '',
    lawyerLegalName: row.lawyerLegalName ?? '',
  }))
}

export function serializeCaseParties(rows: CasePartyDraft[]) {
  return rows
    .map((row) => ({
      legalName: row.legalName.trim(),
      city: row.city.trim(),
      postalCode: row.postalCode.trim(),
      country: row.country,
      address: row.address.trim(),
      lawyerLegalName: row.lawyerLegalName.trim(),
    }))
    .filter((row) => row.legalName || row.address || row.lawyerLegalName)
}
