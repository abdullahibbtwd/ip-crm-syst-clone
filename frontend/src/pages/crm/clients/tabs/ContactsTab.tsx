import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOutletContext } from 'react-router-dom'
import { Plus } from 'lucide-react'
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
import {
  useContacts,
  useCreateContact,
  useDeactivateContact,
} from '@/features/crm/hooks/useContacts'
import { getApiErrorMessage } from '@/lib/api-client'
import type { ContactRole } from '@/features/crm/types'
import type { ClientTabContext } from '../ClientLayout'

const ROLE_TAB_VALUES: { value: ContactRole | 'all'; key: string }[] = [
  { value: 'all', key: 'role.all' },
  { value: 'primary', key: 'role.primary' },
  { value: 'billing', key: 'role.billing' },
  { value: 'conflict', key: 'role.conflict' },
  { value: 'general', key: 'role.general' },
]

const CONTACT_ROLES: ContactRole[] = ['primary', 'billing', 'conflict', 'general']

export function ContactsTab() {
  const { t } = useTranslation(['crm', 'common'])
  const { clientId } = useOutletContext<ClientTabContext>()
  const [roleFilter, setRoleFilter] = useState<ContactRole | 'all'>('all')
  const role = roleFilter === 'all' ? undefined : roleFilter
  const { data: contacts, isLoading } = useContacts(clientId, role)
  const deactivate = useDeactivateContact(clientId)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const roleTabs = useMemo(
    () =>
      ROLE_TAB_VALUES.map((tab) => ({
        ...tab,
        label: t(`contacts.${tab.key}`),
      })),
    [t],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {roleTabs.map((tab) => (
            <Button
              key={tab.value}
              type="button"
              size="sm"
              variant={roleFilter === tab.value ? 'default' : 'outline'}
              onClick={() => setRoleFilter(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <PermissionGate resource="client" action="update">
          <Button size="sm" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" />
            {t('contacts.add')}
          </Button>
        </PermissionGate>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">{t('contacts.loading')}</p>}

      {contacts && (
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('contacts.table.name')}</TableHead>
                <TableHead>{t('contacts.table.role')}</TableHead>
                <TableHead>{t('contacts.table.email')}</TableHead>
                <TableHead>{t('contacts.table.office')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t('contacts.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      {contact.firstName} {contact.lastName}
                      {contact.position && (
                        <p className="text-xs text-muted-foreground">{contact.position}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {t(`contacts.role.${contact.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>{contact.email ?? t('yesNo.dash', { ns: 'common' })}</TableCell>
                    <TableCell>{contact.office?.label ?? t('yesNo.dash', { ns: 'common' })}</TableCell>
                    <TableCell>
                      <PermissionGate resource="client" action="update">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deactivate.mutate(contact.id)}
                        >
                          {t('contacts.remove')}
                        </Button>
                      </PermissionGate>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      )}

      <AddContactDrawer
        clientId={clientId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  )
}

function AddContactDrawer({
  clientId,
  open,
  onClose,
}: {
  clientId: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation(['crm', 'common'])
  const createContact = useCreateContact(clientId)
  const [role, setRole] = useState<ContactRole>('primary')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
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
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={createContact.isPending}>
          {createContact.isPending ? t('loading.saving', { ns: 'common' }) : t('contacts.save')}
        </Button>
      </form>
    </Drawer>
  )
}
