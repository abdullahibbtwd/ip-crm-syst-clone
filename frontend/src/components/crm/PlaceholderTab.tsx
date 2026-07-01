import { ComingSoon } from '@/components/dashboard/ComingSoon'

export function PlaceholderTab({ title }: { title: string }) {
  return <ComingSoon title={`${title} - coming soon`} compact />
}
