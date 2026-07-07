import { Link } from 'react-router-dom'
import { ListChecks } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMyTasks } from '@/features/tasks/hooks/useTasks'
import {
  formatTaskDueLabel,
  PRIORITY_DOT_CLASS,
  PRIORITY_PREFIX,
  TASK_PRIORITY_LABELS,
} from '@/features/tasks/utils'
import { cn } from '@/lib/utils'

import { ReportPanel } from '@/components/reports/report-ui'

export function MyTasksWidget() {
  const { data, isLoading, isError } = useMyTasks({ limit: 8 })
  const tasks = data?.items ?? []

  return (
    <ReportPanel className="p-0 overflow-hidden">
      <div className="flex flex-row items-center justify-between gap-3 p-5 md:px-6">
        <h3 className="flex items-center gap-2.5 font-serif text-lg text-brand-green">
          <ListChecks className="size-5 text-primary" />
          My tasks
        </h3>
        <Link to="/tasks" className="text-xs font-semibold text-primary hover:underline">
          View board
        </Link>
      </div>
      <div className="px-5 pb-5 md:px-6 md:pb-6">
        {isLoading ? (
          <div className="py-4 text-sm text-muted-foreground italic">Syncing tasks…</div>
        ) : isError ? (
          <div className="py-4 text-sm text-destructive font-medium">Error loading task list.</div>
        ) : tasks.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground italic bg-muted/20 rounded-lg border border-dashed">
            No pending tasks assigned to you.
          </div>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/matters/${task.matterId}/tasks`}
                  className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-3.5 shadow-xs transition-style duration-200 hover:border-primary/20 hover:bg-muted/40 hover:shadow-sm"
                >
                  <div className="relative mt-1">
                    <span
                      className={cn(
                        'block size-2 rounded-full',
                        PRIORITY_DOT_CLASS[task.priority],
                      )}
                      aria-hidden
                    />
                    <div className={cn(
                      'absolute -inset-1 rounded-full blur-[4px] opacity-30',
                      PRIORITY_DOT_CLASS[task.priority]
                    )} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {TASK_PRIORITY_LABELS[task.priority]} Priority
                      </span>
                      <span className="text-sm font-semibold text-brand-green leading-tight group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground/80 lowercase">
                      <span className="flex items-center gap-1.5">
                        <span className="size-1 rounded-full bg-border" />
                        {formatTaskDueLabel(task.dueDate)}
                      </span>
                      {task.matter ? (
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="size-1 rounded-full bg-border" />
                          <span className="truncate">{task.matter.title}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ReportPanel>
  )
}
