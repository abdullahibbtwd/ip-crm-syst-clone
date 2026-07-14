export type PrecedentStatus = 'draft' | 'published' | 'archived'

export type PrecedentUser = {
  id: string
  fullName: string
  email: string
}

export type Precedent = {
  id: string
  title: string
  matterType: string | null
  jurisdiction: string | null
  category: string
  tags: string[]
  bodyHtml: string
  status: PrecedentStatus
  sourceMatterId: string | null
  createdById: string
  createdBy: PrecedentUser
  createdAt: string
  updatedAt: string
}

export type PrecedentDetail = Precedent & {
  versions: Array<{
    id: string
    bodyHtml: string
    editedBy: PrecedentUser
    createdAt: string
  }>
  sourceMatter: { id: string; title: string; matterType: string } | null
}

export type ListPrecedentsParams = {
  q?: string
  jurisdiction?: string
  matterType?: string
  category?: string
  status?: PrecedentStatus
  limit?: number
}

export type CreatePrecedentInput = {
  title: string
  category: string
  bodyHtml: string
  matterType?: string
  jurisdiction?: string
  tags?: string[]
  sourceMatterId?: string
}

export type UpdatePrecedentInput = {
  title?: string
  category?: string
  bodyHtml?: string
  matterType?: string | null
  jurisdiction?: string | null
  tags?: string[]
}

export type HarvestPrecedentInput = {
  title: string
  category: string
  matterType?: string
  jurisdiction?: string
  tags?: string[]
}
