import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCreateHoliday,
  useHolidays,
  useRemoveHoliday,
  useUpdateHoliday,
} from '@/features/holidays/hooks/useHolidays'
import type { Holiday } from '@/features/holidays/types'
import { jurisdictionsKeys } from '@/features/jurisdictions/queryKeys'
import { getApiErrorMessage } from '@/lib/api-client'

function toDateInputValue(iso: string) {
  return iso.slice(0, 10)
}

function HolidayDrawer({
  open,
  onClose,
  holiday,
  lockedJurisdiction,
}: {
  open: boolean
  onClose: () => void
  holiday: Holiday | null
  lockedJurisdiction: string
}) {
  const { t } = useTranslation('settings')
  const isEdit = Boolean(holiday)
  const createHoliday = useCreateHoliday()
  const updateHoliday = useUpdateHoliday()
  const qc = useQueryClient()

  const [date, setDate] = useState('')
  const [name, setName] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (holiday) {
      setDate(toDateInputValue(holiday.date))
      setName(holiday.name)
      setIsRecurring(holiday.isRecurring)
    } else {
      setDate('')
      setName('')
      setIsRecurring(false)
    }
    setError(null)
  }, [open, holiday])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !date) {
      setError(t('holidays.errors.required'))
      return
    }

    try {
      if (isEdit && holiday) {
        await updateHoliday.mutateAsync({
          id: holiday.id,
          data: {
            jurisdiction: lockedJurisdiction,
            date,
            name: name.trim(),
            isRecurring,
          },
        })
      } else {
        await createHoliday.mutateAsync({
          jurisdiction: lockedJurisdiction,
          date,
          name: name.trim(),
          isRecurring,
        })
      }
      void qc.invalidateQueries({ queryKey: jurisdictionsKeys.all })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('holidays.errors.saveFailed')))
    }
  }

  const pending = createHoliday.isPending || updateHoliday.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? t('holidays.drawer.editTitle') : t('holidays.drawer.createTitle')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="holiday-date">{t('holidays.drawer.date')}</Label>
          <Input
            id="holiday-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="holiday-name">{t('holidays.drawer.name')}</Label>
          <Input
            id="holiday-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('holidays.drawer.recurring')}</Label>
          <Select
            value={isRecurring ? 'yes' : 'no'}
            onValueChange={(v) => setIsRecurring(v === 'yes')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">{t('holidays.recurring.no')}</SelectItem>
              <SelectItem value="yes">{t('holidays.recurring.yes')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('holidays.drawer.cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? t('holidays.drawer.save') : t('holidays.drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

type HolidaysPanelProps = {
  jurisdictionCode: string
}

export function HolidaysPanel({ jurisdictionCode }: HolidaysPanelProps) {
  const { t } = useTranslation('settings')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const removeHoliday = useRemoveHoliday()
  const qc = useQueryClient()

  const { data: holidays, isLoading, isError } = useHolidays({
    jurisdiction: jurisdictionCode,
  })

  const handleDelete = async (holiday: Holiday) => {
    if (!window.confirm(t('holidays.confirmDelete', { name: holiday.name }))) return
    try {
      await removeHoliday.mutateAsync(holiday.id)
      void qc.invalidateQueries({ queryKey: jurisdictionsKeys.all })
    } catch {
      /* list will stay; user can retry */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PermissionGate resource="deadline" action="create">
          <Button
            type="button"
            onClick={() => {
              setEditingHoliday(null)
              setDrawerOpen(true)
            }}
          >
            <Plus className="mr-1 size-4" />
            {t('holidays.newHoliday')}
          </Button>
        </PermissionGate>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">{t('holidays.loading')}</p>
      )}
      {isError && (
        <p className="text-sm text-destructive">{t('holidays.loadError')}</p>
      )}

      {holidays && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('holidays.columns.date')}</TableHead>
              <TableHead>{t('holidays.columns.name')}</TableHead>
              <TableHead>{t('holidays.columns.recurring')}</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t('jurisdictions.hub.noHolidays')}
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="text-sm">
                    {toDateInputValue(holiday.date)}
                  </TableCell>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>
                    {holiday.isRecurring ? (
                      <Badge variant="info">{t('holidays.recurring.yes')}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {t('holidays.recurring.no')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <PermissionGate resource="deadline" action="update">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingHoliday(holiday)
                            setDrawerOpen(true)
                          }}
                          aria-label={t('holidays.editAria')}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDelete(holiday)}
                          disabled={removeHoliday.isPending}
                          aria-label={t('holidays.deleteAria')}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <HolidayDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setEditingHoliday(null)
        }}
        holiday={editingHoliday}
        lockedJurisdiction={jurisdictionCode}
      />
    </div>
  )
}
