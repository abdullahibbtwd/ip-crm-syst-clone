export type TaskStatus = 'pending' | 'completed'
export type TaskPriority = 'high' | 'normal'

export type TaskUser = {
  id: string
  fullName: string
  email: string
}

export type TaskMatterSummary = {
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

export type Task = {
  id: string
  matterId: string
  title: string
  notes: string | null
  assignedToId: string
  createdById: string | null
  dueDate: string | null
  priority: TaskPriority
  status: TaskStatus
  completedAt: string | null
  completedById: string | null
  createdAt: string
  updatedAt: string
  assignedTo: TaskUser
  createdBy: TaskUser | null
  completedBy: TaskUser | null
  matter?: TaskMatterSummary
}

export type TaskListResponse = {
  items: Task[]
  nextCursor: string | null
}

export type CreateTaskInput = {
  title: string
  assignedToId: string
  dueDate?: string
  priority?: TaskPriority
  notes?: string
}

export type UpdateTaskInput = {
  title?: string
  assignedToId?: string
  dueDate?: string | null
  priority?: TaskPriority
  notes?: string | null
  status?: TaskStatus
}

export type TeamMember = {
  id: string
  fullName: string
  email: string
  roles: string[]
}
