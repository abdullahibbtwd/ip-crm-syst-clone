export type JurisdictionType = 'national' | 'regional' | 'international'

export type JurisdictionAutomationLevel = 'full' | 'partial' | 'manual'

export type Jurisdiction = {
  id: string
  code: string
  name: string
  officeName: string
  type: JurisdictionType
  isPriority: boolean
  isActive: boolean
  sortOrder: number
  ruleCount: number
  holidayCount: number
  automationLevel: JurisdictionAutomationLevel
  createdAt: string
  updatedAt: string
}

export type ListJurisdictionsParams = {
  activeOnly?: boolean
  priorityOnly?: boolean
  type?: JurisdictionType
  q?: string
}

export type CreateJurisdictionInput = {
  code: string
  name: string
  officeName: string
  type?: JurisdictionType
  isPriority?: boolean
  isActive?: boolean
  sortOrder?: number
}

export type UpdateJurisdictionInput = {
  name?: string
  officeName?: string
  type?: JurisdictionType
  isPriority?: boolean
  isActive?: boolean
  sortOrder?: number
}

export type JurisdictionOption = {
  value: string
  label: string
}
