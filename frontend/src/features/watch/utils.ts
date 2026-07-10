import i18n from '@/i18n'
import { jurisdictionLabel } from '@/features/deadlines/utils'
import type { WatchAlertStatus, WatchProfileStatus, WatchRegistrySource } from './types'

export const REGISTRY_SOURCE_LABELS: Record<WatchRegistrySource, string> = {
  BPO: 'BPO (Bulgaria)',
  EUIPO: 'EUIPO',
  WIPO: 'WIPO',
  EPO: 'EPO (OPS)',
}

export function registrySourceLabel(source: WatchRegistrySource) {
  return REGISTRY_SOURCE_LABELS[source] ?? source
}

export function watchProfileStatusLabel(status: WatchProfileStatus) {
  return i18n.t(`profileStatus.${status}`, { ns: 'watch' })
}

export function watchAlertStatusLabel(status: WatchAlertStatus) {
  return i18n.t(`alertStatus.${status}`, { ns: 'watch' })
}

export function formatNiceClasses(classes: number[]) {
  if (classes.length === 0) return '—'
  return classes.sort((a, b) => a - b).join(', ')
}

export function formatWatchJurisdictions(codes: string[]) {
  if (codes.length === 0) return '—'
  return codes.map((c) => jurisdictionLabel(c)).join(' · ')
}

export function formatDetectedAt(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export const WATCH_ALERT_STATUS_VARIANT: Record<
  WatchAlertStatus,
  'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  new: 'warning',
  rejected: 'secondary',
  accepted: 'success',
}

export const WATCH_PROFILE_STATUS_VARIANT: Record<
  WatchProfileStatus,
  'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning' | 'info'
> = {
  active: 'success',
  paused: 'warning',
  archived: 'secondary',
}
