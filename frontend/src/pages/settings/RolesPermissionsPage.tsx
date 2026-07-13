import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RoleGate } from '@/components/permissions/RoleGate'
import { apiClient } from '@/lib/api-client'
import { roleLabel } from '@/lib/rbac'

type RolesMatrixResponse = {
  roles: Array<{
    id: string
    name: string
    description: string | null
    isSystem: boolean
    permissions: string[]
  }>
}

export function RolesPermissionsPage() {
  const { t } = useTranslation('settings')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['roles-matrix'],
    queryFn: () => apiClient.get<RolesMatrixResponse>('/roles'),
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link to="/settings" className="hover:text-foreground">
            {t('title')}
          </Link>
          <span className="mx-2">/</span>
          {t('roles.title')}
        </p>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">
          {t('roles.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('roles.subtitle')}</p>
      </div>

      <RoleGate
        roles={['managing_partner', 'it_admin']}
        fallback={<p className="text-sm text-muted-foreground">{t('roles.noPermission')}</p>}
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('roles.loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('roles.error')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('roles.columns.role')}</TableHead>
                  <TableHead>{t('roles.columns.description')}</TableHead>
                  <TableHead>{t('roles.columns.permissions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="align-top">
                      <div className="flex items-center gap-2 font-medium">
                        <ShieldCheck className="size-4 text-primary" />
                        {roleLabel(role.name as 'managing_partner') || role.name}
                      </div>
                      {role.isSystem ? (
                        <Badge variant="secondary" className="mt-1">
                          {t('roles.system')}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="align-top text-muted-foreground">
                      {role.description || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((p) => (
                          <Badge key={p} variant="outline" className="font-mono text-[10px]">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </RoleGate>
    </div>
  )
}
