import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { apiClient } from '@/lib/api-client'

type FirmDocument = {
  id: string
  displayName: string
  category: string
  matterId: string
  matterTitle: string
  updatedAt: string
  createdBy: { fullName: string }
}

export function StaffDocumentsPage() {
  const { t } = useTranslation('documents')
  const { t: tCommon } = useTranslation('common')
  const [search, setSearch] = useState('')
  const { data, isLoading, isError } = useQuery({
    queryKey: ['documents', 'firm', search],
    queryFn: () =>
      apiClient.get<FirmDocument[]>('/documents', {
        search: search.trim() || undefined,
      }),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <PermissionGate
        resource="document"
        action="read"
        fallback={<p className="text-sm text-muted-foreground">{tCommon('noPermission')}</p>}
      >
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : isError ? (
          <p className="text-sm text-destructive">{t('loadFailed')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('columns.name')}</TableHead>
                  <TableHead>{t('columns.matter')}</TableHead>
                  <TableHead>{t('columns.category')}</TableHead>
                  <TableHead>{t('columns.updated')}</TableHead>
                  <TableHead>{t('columns.by')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  (data ?? []).map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.displayName}</TableCell>
                      <TableCell>
                        <Link
                          to={`/matters/${doc.matterId}/documents`}
                          className="text-primary hover:underline"
                        >
                          {doc.matterTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell>{new Date(doc.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>{doc.createdBy.fullName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </PermissionGate>
    </div>
  )
}
