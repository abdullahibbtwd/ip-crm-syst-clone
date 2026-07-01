import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useHoldingGroup } from '@/features/crm/hooks/useHoldingGroups'
import { clientDisplayName } from '@/features/crm/utils'
import { getCountryLabel } from '@/lib/countries'

export function HoldingGroupDetailPage() {
  const { id = '' } = useParams()
  const { data, isLoading, isError } = useHoldingGroup(id)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError || !data) {
    return <p className="text-sm text-destructive">Holding group not found.</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl">{data.name}</h1>
          {data.country && (
            <p className="mt-1 text-sm text-muted-foreground">{getCountryLabel(data.country)}</p>
          )}
        </div>
        <Link to="/holding-groups" className={buttonVariants({ variant: 'outline' })}>
          All holding groups
        </Link>
      </div>

      {data.description && (
        <Card className="shadow-none">
          <CardContent className="pt-4 text-sm text-muted-foreground">
            {data.description}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Clients under this group</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.clients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients linked yet.</p>
          ) : (
            data.clients.map((client) => (
              <Link
                key={client.id}
                to={`/clients/${client.id}/overview`}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <span>
                  {client.internalCode} - {clientDisplayName(client)}
                </span>
                <Badge variant="secondary" className="capitalize">
                  {client.status}
                </Badge>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
