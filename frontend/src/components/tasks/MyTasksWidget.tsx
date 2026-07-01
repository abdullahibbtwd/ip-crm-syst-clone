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

export function MyTasksWidget() {
  const { data, isLoading, isError } = useMyTasks(8)
  const tasks = data?.items ?? []

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="size-4" />
          My tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load tasks.</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks assigned to you.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  to={`/matters/${task.matterId}/tasks`}
                  className="flex items-start gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      PRIORITY_DOT_CLASS[task.priority],
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-xs text-muted-foreground">
                        {PRIORITY_PREFIX[task.priority]} {TASK_PRIORITY_LABELS[task.priority]}
                      </span>
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatTaskDueLabel(task.dueDate)}
                      {task.matter ? ` · ${task.matter.title}` : ''}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
