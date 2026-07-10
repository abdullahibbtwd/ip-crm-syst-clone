export type RetentionEntityType = 'intake_leads' | 'audit_logs'

export type RetentionAction = 'anonymize' | 'delete'

export type RetentionConditionJson = {
  status?: string
  statusNotIn?: string[]
}

export type RetentionRule = {
  id: string
  entityType: string
  conditionJson: RetentionConditionJson | Record<string, unknown>
  retentionDays: number
  action: RetentionAction
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type RetentionDryRunResult = {
  ruleId: string
  entityType: string
  action: RetentionAction
  retentionDays: number
  cutoff: string
  wouldAffect: number
}

export type CreateRetentionRuleInput = {
  entityType: RetentionEntityType
  conditionJson?: RetentionConditionJson
  retentionDays: number
  action: RetentionAction
  description?: string
}

export type UpdateRetentionRuleInput = {
  conditionJson?: RetentionConditionJson
  retentionDays?: number
  action?: RetentionAction
  description?: string | null
  isActive?: boolean
}

/** UI condition presets for intake_leads */
export type IntakeConditionPreset = 'rejected' | 'not_converted' | 'none'
