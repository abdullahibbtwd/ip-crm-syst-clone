export type DeadlineStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'escalated'
  | 'superseded'

export type DeadlineEventType =
  | 'filing'
  | 'examination_response'
  | 'renewal'
  | 'opposition'
  | 'grace_period'

export type DeadlineUser = {
  id: string
  fullName: string
  email: string
}

export type DeadlineMatterSummary = {
  id: string
  title: string
  matterType: string
  client: {
    id: string
    internalCode: string | null
    companyName: string | null
    firstName: string | null
    lastName: string | null
    type: string
  }
}

export type Deadline = {
  id: string
  matterId: string
  ruleId: string | null
  title: string
  jurisdiction: string | null
  notes: string | null
  dueDate: string
  graceDate: string | null
  assignedToId: string
  status: DeadlineStatus
  escalationLevel: number
  reminderSentAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  assignedTo: DeadlineUser
  rule: {
    id: string
    jurisdiction: string
    eventType: DeadlineEventType
    triggerType?: string
    daysOffset?: number
    priority: number
    description: string | null
  } | null
  matter?: DeadlineMatterSummary
}

export type DeadlineListResponse = {
  items: Deadline[]
  nextCursor: string | null
}

export type MyDeadlinesTab = 'all' | 'pending' | 'in_progress' | 'overdue' | 'completed'

export type MyDeadlinesFilters = {
  tab?: MyDeadlinesTab
  status?: DeadlineStatus
  cursor?: string
  limit?: number
}

export type AllDeadlinesFilters = {
  assignedToId?: string
  matterType?: string
  jurisdiction?: string
  status?: DeadlineStatus
  dueFrom?: string
  dueTo?: string
  overdue?: boolean
  cursor?: string
  limit?: number
}

export type CreateDeadlineInput = {
  matterId: string
  title: string
  jurisdiction: string
  dueDate: string
  graceDate?: string
  assignedToId: string
  notes?: string
}

export type DeadlineUrgency = 'overdue' | 'today' | 'urgent' | 'soon' | 'ok' | 'completed'
