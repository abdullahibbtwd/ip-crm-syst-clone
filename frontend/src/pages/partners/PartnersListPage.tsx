import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, UserX } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  useCreatePartner,
  useDeactivatePartner,
  usePartners,
  useUpdatePartner,
} from '@/features/partners/hooks/usePartners'
import type { Partner } from '@/features/partners/types'
import { getApiErrorMessage } from '@/lib/api-client'

function PartnerDrawer({
  open,
  onClose,
  partner,
}: {
  open: boolean
  onClose: () => void
  partner: Partner | null
}) {
  const { t } = useTranslation('partners')
  const isEdit = Boolean(partner)
  const createPartner = useCreatePartner()
  const updatePartner = useUpdatePartner()

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [jurisdictions, setJurisdictions] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (partner) {
      setName(partner.name)
      setCompany(partner.company ?? '')
      setEmail(partner.email ?? '')
      setPhone(partner.phone ?? '')
      setCountryCode(partner.countryCode ?? '')
      setJurisdictions(partner.jurisdictions.join(', '))
      setNotes(partner.notes ?? '')
      setIsActive(partner.isActive)
    } else {
      setName('')
      setCompany('')
      setEmail('')
      setPhone('')
      setCountryCode('')
      setJurisdictions('')
      setNotes('')
      setIsActive(true)
    }
    setError(null)
  }, [open, partner])

  const parseJurisdictions = () =>
    jurisdictions
      .split(/[,;\s]+/)
      .map((j) => j.trim().toUpperCase())
      .filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError(t('errors.nameRequired'))
      return
    }

    try {
      if (isEdit && partner) {
        await updatePartner.mutateAsync({
          id: partner.id,
          data: {
            name: name.trim(),
            company: company.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            countryCode: countryCode.trim() || null,
            jurisdictions: parseJurisdictions(),
            notes: notes.trim() || null,
            isActive,
          },
        })
      } else {
        await createPartner.mutateAsync({
          name: name.trim(),
          company: company.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          countryCode: countryCode.trim() || undefined,
          jurisdictions: parseJurisdictions(),
          notes: notes.trim() || undefined,
        })
      }
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t('errors.saveFailed')))
    }
  }

  const pending = createPartner.isPending || updatePartner.isPending

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? t('drawer.editTitle') : t('drawer.createTitle')}
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="partner-name">{t('drawer.name')}</Label>
          <Input
            id="partner-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-company">{t('drawer.company')}</Label>
          <Input
            id="partner-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-email">{t('drawer.email')}</Label>
          <Input
            id="partner-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-phone">{t('drawer.phone')}</Label>
          <Input
            id="partner-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-country">{t('drawer.countryCode')}</Label>
          <Input
            id="partner-country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            placeholder="BG"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-jurisdictions">{t('drawer.jurisdictions')}</Label>
          <Input
            id="partner-jurisdictions"
            value={jurisdictions}
            onChange={(e) => setJurisdictions(e.target.value)}
            placeholder="BG, EU, EP"
          />
          <p className="text-xs text-muted-foreground">{t('drawer.jurisdictionsHint')}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="partner-notes">{t('drawer.notes')}</Label>
          <Textarea
            id="partner-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {isEdit && (
          <div className="space-y-2">
            <Label>{t('drawer.status')}</Label>
            <Select
              value={isActive ? 'active' : 'inactive'}
              onValueChange={(v) => setIsActive(v === 'active')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('status.active')}</SelectItem>
                <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('drawer.cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {isEdit ? t('drawer.save') : t('drawer.create')}
          </Button>
        </div>
      </form>
    </Drawer>
  )
}

export function PartnersListPage() {
  const { t } = useTranslation('partners')
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'active'>('all')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Partner | null>(null)
  const deactivate = useDeactivatePartner()

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  const { data: partners, isLoading, isError } = usePartners({
    ...(activeFilter === 'active' ? { activeOnly: true } : {}),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
  })

  const handleDeactivate = async (partner: Partner) => {
    if (!window.confirm(t('confirmDeactivate', { name: partner.name }))) return
    try {
      await deactivate.mutateAsync(partner.id)
    } catch {
      /* ignore */
    }
  }

  return (
    <PermissionGate
      resource="partner"
      action="read"
      fallback={
        <p className="text-sm text-muted-foreground">{t('noPermission')}</p>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl text-foreground md:text-3xl">{t('title')}</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t('subtitle')}</p>
          </div>
          <PermissionGate resource="partner" action="create">
            <Button
              type="button"
              onClick={() => {
                setEditing(null)
                setDrawerOpen(true)
              }}
            >
              <Plus className="mr-1 size-4" />
              {t('newPartner')}
            </Button>
          </PermissionGate>
        </div>

        <div className="flex flex-wrap gap-3">
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-xs"
          />
          <Select
            value={activeFilter}
            onValueChange={(v) => setActiveFilter((v as 'all' | 'active') ?? 'all')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('filters.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.all')}</SelectItem>
              <SelectItem value="active">{t('filters.activeOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">{t('loading')}</p>}
        {isError && <p className="text-sm text-destructive">{t('loadError')}</p>}

        {partners && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('columns.name')}</TableHead>
                <TableHead>{t('columns.company')}</TableHead>
                <TableHead>{t('columns.email')}</TableHead>
                <TableHead>{t('columns.jurisdictions')}</TableHead>
                <TableHead>{t('columns.status')}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('empty')}
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((partner) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {partner.company ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {partner.email ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {partner.jurisdictions.length > 0
                        ? partner.jurisdictions.join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={partner.isActive ? 'info' : 'secondary'}>
                        {partner.isActive ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <PermissionGate resource="partner" action="update">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditing(partner)
                              setDrawerOpen(true)
                            }}
                            aria-label={t('editAria')}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          {partner.isActive && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeactivate(partner)}
                              disabled={deactivate.isPending}
                              aria-label={t('deactivateAria')}
                            >
                              <UserX className="size-3.5" />
                            </Button>
                          )}
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <PartnerDrawer
          open={drawerOpen}
          onClose={() => {
            setDrawerOpen(false)
            setEditing(null)
          }}
          partner={editing}
        />
      </div>
    </PermissionGate>
  )
}
