export const documentTemplatesKeys = {
  all: ['document-templates'] as const,
  lists: () => [...documentTemplatesKeys.all, 'list'] as const,
  listAdmin: () => [...documentTemplatesKeys.lists(), 'admin'] as const,
  mergeFields: () => [...documentTemplatesKeys.all, 'merge-fields'] as const,
  detail: (id: string) => [...documentTemplatesKeys.all, 'detail', id] as const,
}
