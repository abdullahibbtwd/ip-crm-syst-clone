import { documentsApi } from '@/features/documents/api'

export const MARK_IMAGE_TAG = 'mark-image'

export type MarkImageRefs = {
  markImageDocumentId: string
  markImageDocumentVersionId: string
}

export function readMarkImageRefs(attrs: Record<string, unknown>): {
  documentId: string | null
  versionId: string | null
} {
  const documentId =
    typeof attrs.markImageDocumentId === 'string' && attrs.markImageDocumentId.trim()
      ? attrs.markImageDocumentId.trim()
      : null
  const versionId =
    typeof attrs.markImageDocumentVersionId === 'string' &&
    attrs.markImageDocumentVersionId.trim()
      ? attrs.markImageDocumentVersionId.trim()
      : null
  return { documentId, versionId }
}

export async function uploadMarkImage(
  matterId: string,
  file: File,
  displayName?: string,
): Promise<MarkImageRefs> {
  const doc = await documentsApi.upload(matterId, {
    file,
    displayName: displayName?.trim() || file.name,
    category: 'evidence',
    tags: MARK_IMAGE_TAG,
  })
  const versionId = doc.latestVersion?.id
  if (!versionId) {
    throw new Error('Mark image upload did not return a version')
  }
  return {
    markImageDocumentId: doc.id,
    markImageDocumentVersionId: versionId,
  }
}

export function markImageAttributePatch(
  refs: MarkImageRefs | null,
): Record<string, string | undefined> {
  if (!refs) {
    return {
      markImageDocumentId: undefined,
      markImageDocumentVersionId: undefined,
    }
  }
  return {
    markImageDocumentId: refs.markImageDocumentId,
    markImageDocumentVersionId: refs.markImageDocumentVersionId,
  }
}
