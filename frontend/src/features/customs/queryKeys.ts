export const customsKeys = {
  all: ['customs'] as const,
  seizures: (matterId: string) => [...customsKeys.all, 'seizures', matterId] as const,
  seizure: (id: string) => [...customsKeys.all, 'seizure', id] as const,
  applications: (matterId: string) => [...customsKeys.all, 'applications', matterId] as const,
}
