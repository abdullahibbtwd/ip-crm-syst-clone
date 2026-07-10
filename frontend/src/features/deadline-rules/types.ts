import type { MatterType } from '@/features/matters/types'

export type DeadlineRuleTriggerType =
  | 'matter_created'
  | 'office_action'
  | 'renewal_due'

export type DeadlineEventType =
  | 'filing'
  | 'examination_response'
  | 'renewal'
  | 'opposition'
  | 'grace_period'

export type DeadlineRule = {
  id: string
  jurisdiction: string
  matterType: MatterType
  eventType: DeadlineEventType
  triggerType: DeadlineRuleTriggerType
  daysOffset: number
  isBusinessDays: boolean
  gracePeriodDays: number
  priority: number
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type ListDeadlineRulesParams = {
  jurisdiction?: string
  matterType?: MatterType
  triggerType?: DeadlineRuleTriggerType
  activeOnly?: boolean
}

export type CreateDeadlineRuleInput = {
  jurisdiction: string
  matterType: MatterType
  eventType: DeadlineEventType
  triggerType: DeadlineRuleTriggerType
  daysOffset: number
  isBusinessDays?: boolean
  gracePeriodDays?: number
  priority?: number
  description?: string
}

export type UpdateDeadlineRuleInput = {
  daysOffset?: number
  isBusinessDays?: boolean
  gracePeriodDays?: number
  priority?: number
  description?: string | null
  isActive?: boolean
}
