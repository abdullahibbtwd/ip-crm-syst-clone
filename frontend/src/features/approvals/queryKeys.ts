export const approvalKeys = {
  all: ['approvals'] as const,
  matter: (matterId: string) => [...approvalKeys.all, 'matter', matterId] as const,
  portal: () => [...approvalKeys.all, 'portal'] as const,
}
