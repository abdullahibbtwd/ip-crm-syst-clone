export type Holiday = {
  id: string
  jurisdiction: string
  date: string
  name: string
  isRecurring: boolean
  createdAt: string
  updatedAt: string
}

export type ListHolidaysParams = {
  jurisdiction?: string
  from?: string
  to?: string
}

export type CreateHolidayInput = {
  jurisdiction: string
  date: string
  name: string
  isRecurring?: boolean
}

export type UpdateHolidayInput = {
  jurisdiction?: string
  date?: string
  name?: string
  isRecurring?: boolean
}
