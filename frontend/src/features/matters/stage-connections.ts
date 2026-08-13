import type { DocumentCategory } from '@/features/documents/types'
import type { ProsecutionStage } from '@/features/matters/prosecution-stages'

export type StageAttachSlot = {
  id: string
  category: DocumentCategory
  /** Stored lowercase on the document as a tag. */
  tag: string
  labelKey: string
  /** Must be attached before Complete stage. */
  required: boolean
}

/** Required / suggested file uploads for each prosecution stage. */
export const STAGE_ATTACHES: Record<ProsecutionStage, StageAttachSlot[]> = {
  prep: [
    {
      id: 'search',
      category: 'evidence',
      tag: 'stage:prep:search',
      labelKey: 'prosecution.hub.attach.search',
      required: false,
    },
  ],
  filing: [
    {
      id: 'application',
      category: 'application',
      tag: 'stage:filing:application',
      labelKey: 'prosecution.hub.attach.application',
      required: true,
    },
  ],
  formal_exam: [
    {
      id: 'fee_slip',
      category: 'general',
      tag: 'stage:formal:fee-payment',
      labelKey: 'prosecution.hub.attach.feeSlip',
      required: true,
    },
    {
      id: 'poa',
      category: 'general',
      tag: 'stage:formal:poa',
      labelKey: 'prosecution.hub.attach.poa',
      required: true,
    },
  ],
  substantive_exam: [
    {
      id: 'office_action',
      category: 'office_action',
      tag: 'stage:substantive:oa',
      labelKey: 'prosecution.hub.attach.officeAction',
      required: false,
    },
    {
      id: 'decision',
      category: 'office_action',
      tag: 'stage:substantive:decision',
      labelKey: 'prosecution.hub.attach.decision',
      required: false,
    },
  ],
  publication: [
    {
      id: 'bulletin',
      category: 'general',
      tag: 'stage:publication:bulletin',
      labelKey: 'prosecution.hub.attach.bulletin',
      required: true,
    },
  ],
  reg_fee: [
    {
      id: 'reg_fee',
      category: 'general',
      tag: 'stage:reg-fee:payment',
      labelKey: 'prosecution.hub.attach.regFee',
      required: true,
    },
  ],
  registration: [
    {
      id: 'certificate',
      category: 'certificate',
      tag: 'stage:registration:certificate',
      labelKey: 'prosecution.hub.attach.certificate',
      required: true,
    },
  ],
}

export function requiredAttachesForStage(
  stage: ProsecutionStage,
  opts?: { hasOfficeAction?: boolean },
): StageAttachSlot[] {
  const slots = STAGE_ATTACHES[stage]
  if (stage === 'substantive_exam' && opts?.hasOfficeAction) {
    return slots.map((s) =>
      s.id === 'office_action' ? { ...s, required: true } : s,
    )
  }
  return slots
}

export function missingRequiredAttachLabels(
  stage: ProsecutionStage,
  documentTags: string[][],
  opts?: { hasOfficeAction?: boolean },
): string[] {
  const flat = new Set(documentTags.flat().map((t) => t.toLowerCase()))
  return requiredAttachesForStage(stage, opts)
    .filter((s) => s.required && !flat.has(s.tag.toLowerCase()))
    .map((s) => s.labelKey)
}
