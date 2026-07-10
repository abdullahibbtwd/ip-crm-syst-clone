export const retentionRulesKeys = {
  all: ['retention-rules'] as const,
  lists: () => [...retentionRulesKeys.all, 'list'] as const,
  list: () => [...retentionRulesKeys.lists()] as const,
  detail: (id: string) => [...retentionRulesKeys.all, 'detail', id] as const,
  dryRun: (id: string) => [...retentionRulesKeys.all, 'dry-run', id] as const,
}
