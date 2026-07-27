import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { useAppAlert } from '@/components/feedback/AppAlertProvider'
import { Drawer } from '@/components/crm/Drawer'
import { TeamMemberSelect } from '@/components/users/TeamMemberSelect'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateTask,
  useDeleteTask,
  useMatterTasks,
  useUpdateTask,
} from '@/features/tasks/hooks/useTasks'
import type { Task, TaskPriority } from '@/features/tasks/types'
import { formatTaskDate } from '@/features/tasks/utils'
import { useAuth } from '@/features/auth/AuthProvider'
import { getApiErrorMessage } from '@/lib/api-client'
import { usePermission } from '@/hooks/usePermission'
import { cn } from '@/lib/utils'
import type { MatterTabContext } from '../MatterLayout'

function TaskRow({
  task,
  matterId,
  currentUserId,
  canDelete,
}: {
  task: Task
  matterId: string
  currentUserId: string
  canDelete: boolean
}) {
  const { t } = useTranslation(['matters', 'common'])
  const { confirm } = useAppAlert()
  const updateTask = useUpdateTask(matterId)
  const deleteTask = useDeleteTask(matterId)

  const isOverdue =
    task.status === 'pending' &&
    task.dueDate &&
    new Date(task.dueDate) < new Date(new Date().toISOString().slice(0, 10))

  const dueLabel = task.dueDate
    ? t('tasks.dueOn', { date: formatTaskDate(task.dueDate) })
    : t('tasks.noDueDate')

  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3',
        task.status === 'completed' && 'bg-muted/30 opacity-80',
        isOverdue && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={task.priority === 'high' ? 'default' : 'outline'}
            className="normal-case"
          >
            {t(`tasks.priority.${task.priority}`)}
          </Badge>
          {task.status === 'completed' ? (
            <Badge variant="secondary" className="normal-case">
              {t('tasks.completed')}
            </Badge>
          ) : null}
          <span className={cn('font-medium', task.status === 'completed' && 'line-through')}>
            {task.title}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('tasks.assignedToUser', { name: task.assignedTo.fullName })} · {dueLabel}
        </p>
        {task.notes ? (
          <p className="text-sm text-muted-foreground">{task.notes}</p>
        ) : null}
        {task.status === 'completed' && task.completedBy ? (
          <p className="text-xs text-muted-foreground">
            {t('tasks.completedByUser', { name: task.completedBy.fullName })}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        {task.status === 'pending' && task.assignedToId === currentUserId ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updateTask.isPending}
            onClick={() => updateTask.mutate({ id: task.id, data: { status: 'completed' } })}
          >
            <Check className="mr-1 size-4" />
            {t('tasks.markComplete')}
          </Button>
        ) : null}
        {canDelete ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={deleteTask.isPending}
            onClick={async () => {
              const ok = await confirm({
                title: t('tasks.deleteTitle'),
                message: t('tasks.deleteMessage'),
                variant: 'danger',
                confirmLabel: t('tasks.delete'),
              })
              if (ok) deleteTask.mutate(task.id)
            }}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function TaskDrawer({
  matterId,
  open,
  onClose,
}: {
  matterId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation(['matters', 'common'])
  const createTask = useCreateTask(matterId)

  const [title, setTitle] = useState('')
  const [assignedToId, setAssignedToId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle('')
    setAssignedToId('')
    setDueDate('')
    setPriority('normal')
    setNotes('')
    setError(null)
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError(t('tasks.form.titleRequired'))
      return
    }
    if (!assignedToId) {
      setError(t('tasks.form.assigneeRequired'))
      return
    }
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        assignedToId,
        dueDate: dueDate || undefined,
        priority,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('tasks.errorCreate')))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('tasks.drawerTitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="task-title">{t('tasks.form.titleLabel')}</Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('tasks.form.titlePlaceholder')}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-assignee">{t('tasks.form.assigneeLabel')}</Label>
          <TeamMemberSelect
            id="task-assignee"
            value={assignedToId}
            onValueChange={setAssignedToId}
            enabled={open}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-due">{t('tasks.form.dueDateOptional')}</Label>
          <Input
            id="task-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-priority">{t('tasks.form.priorityLabel')}</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger id="task-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">{t('tasks.priority.high')}</SelectItem>
              <SelectItem value="normal">{t('tasks.priority.normal')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-notes">{t('tasks.form.notesOptional')}</Label>
          <Textarea
            id="task-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t('tasks.form.notesPlaceholder')}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={createTask.isPending}>
            {createTask.isPending ? t('loading.saving', { ns: 'common' }) : t('tasks.add')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export function MatterTasksTab() {
  const { t } = useTranslation(['matters', 'common'])
  const { matterId } = useOutletContext<MatterTabContext>()
  const { user } = useAuth()
  const { data: tasks, isLoading, isError } = useMatterTasks(matterId)
  const canDelete = usePermission('task', 'delete')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { pending, completed } = useMemo(() => {
    const all = tasks ?? []
    return {
      pending: all.filter((task) => task.status === 'pending'),
      completed: all.filter((task) => task.status === 'completed'),
    }
  }, [tasks])

  if (isLoading && !tasks) {
    return <p className="text-sm text-muted-foreground">{t('tasks.loading')}</p>
  }
  if (isError) {
    return <p className="text-sm text-destructive">{t('tasks.error')}</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{t('tasks.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('tasks.description')}</p>
        </div>
        <PermissionGate resource="task" action="create">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setDrawerOpen(true)}
          >
            <Plus className="mr-1 size-4" />
            {t('tasks.add')}
          </Button>
        </PermissionGate>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">{t('tasks.open')}</h3>
        {pending.length === 0 ? (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {t('tasks.emptyOpen')}
          </p>
        ) : (
          pending.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              matterId={matterId}
              currentUserId={user?.id ?? ''}
              canDelete={canDelete}
            />
          ))
        )}
      </section>

      {completed.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">{t('tasks.completed')}</h3>
          {completed.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              matterId={matterId}
              currentUserId={user?.id ?? ''}
              canDelete={canDelete}
            />
          ))}
        </section>
      ) : null}

      <TaskDrawer
        matterId={matterId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}
