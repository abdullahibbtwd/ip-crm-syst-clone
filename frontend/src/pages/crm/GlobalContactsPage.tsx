import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { Drawer } from '@/components/crm/Drawer'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useClients } from '@/features/crm/hooks/useClients'
import { useCreateContact, useGlobalContacts } from '@/features/crm/hooks/useContacts'
import type { ContactRole } from '@/features/crm/types'
import { getApiErrorMessage } from '@/lib/api-client'

const ALL_ROLES = 'all'
const CONTACT_ROLES: ContactRole[] = ['primary', 'billing', 'conflict', 'general']

export function GlobalContactsPage() {
  const { t } = useTranslation(['crm', 'common'])
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<ContactRole | undefined>()
  const [cursor, setCursor] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setCursor(undefined)
  }, [debouncedSearch, roleFilter])

  const filters = {
    search: debouncedSearch || undefined,
    role: roleFilter,
    cursor,
    limit: 25,
  }

  const { data, isLoading, isError } = useGlobalContacts(filters)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('globalContacts.title')}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t('globalContacts.description')}
          </p>
        </div>
        <PermissionGate resource="client" action="update">
          <Button type="button" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            {t('contacts.add')}
          </Button>
        </PermissionGate>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-muted/15 p-4">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('globalContacts.searchPlaceholder')}
            className="bg-background pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          value={roleFilter ?? ALL_ROLES}
          onValueChange={(v) => setRoleFilter(v === ALL_ROLES ? undefined : (v as ContactRole))}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ROLES}>{t('contacts.role.all')}</SelectItem>
            {CONTACT_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {t(`contacts.role.${role}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('contacts.loading')}</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{t('globalContacts.error')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('contacts.table.name')}</TableHead>
              <TableHead>{t('globalContacts.table.client')}</TableHead>
              <TableHead>{t('contacts.table.role')}</TableHead>
              <TableHead>{t('contacts.table.email')}</TableHead>
              <TableHead>{t('contacts.table.phone')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  {t('contacts.empty')}
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    {contact.firstName} {contact.lastName}
                    {contact.position ? (
                      <p className="text-xs text-muted-foreground">{contact.position}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {contact.client ? (
                      <Link
                        to={`/clients/${contact.client.id}/contacts`}
                        className="text-primary hover:underline"
                      >
                        {contact.client.displayName ?? contact.client.companyName ?? contact.client.internalCode}
                      </Link>
                    ) : (
                      t('yesNo.dash', { ns: 'common' })
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {t(`contacts.role.${contact.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.email ?? t('yesNo.dash', { ns: 'common' })}</TableCell>
                  <TableCell>
                    {contact.phone ?? contact.mobile ?? t('yesNo.dash', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {data?.nextCursor ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setCursor(data.nextCursor ?? undefined)}>
          {t('common:pagination.loadMore', { defaultValue: 'Load more' })}
        </Button>
      ) : null}

      <AddGlobalContactDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}

function AddGlobalContactDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation(['crm', 'common'])
  const { data: clients } = useClients({ limit: 100, sortBy: 'name', sortOrder: 'asc' })
  const [clientId, setClientId] = useState('')
  const createContact = useCreateContact(clientId)
  const [role, setRole] = useState<ContactRole>('primary')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!clientId) {
      setError(t('globalContacts.selectClient'))
      return
    }
    try {
      await createContact.mutateAsync({
        role,
        firstName,
        lastName,
        email: email || undefined,
      })
      setFirstName('')
      setLastName('')
      setEmail('')
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={t('contacts.drawerTitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('globalContacts.table.client')}</label>
          <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
            <SelectTrigger>
              <SelectValue placeholder={t('globalContacts.selectClient')} />
            </SelectTrigger>
            <SelectContent>
              {(clients?.items ?? []).map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('contacts.table.role')}</label>
          <Select value={role} onValueChange={(v) => setRole(v as ContactRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_ROLES.map((contactRole) => (
                <SelectItem key={contactRole} value={contactRole}>
                  {t(`contacts.role.${contactRole}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('contacts.firstName')}</label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('contacts.lastName')}</label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t('contacts.email')}</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={createContact.isPending || !clientId}>
          {createContact.isPending ? t('loading.saving', { ns: 'common' }) : t('contacts.save')}
        </Button>
      </form>
    </Drawer>
  )
}
