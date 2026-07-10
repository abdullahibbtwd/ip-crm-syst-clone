import { Loader2, Link2, Paperclip, Reply } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Drawer } from '@/components/crm/Drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/permissions/PermissionGate'
import { emailIntegrationApi } from '../api'
import { emailIntegrationKeys } from '../queryKeys'
import { EmailAiSummary } from './EmailAiSummary'

type EmailPreviewDrawerProps = {
  emailId: string | null
  onClose: () => void
  onAttachToMatter?: () => void
  onReply?: () => void
}

function formatReceived(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  )
}

export function EmailPreviewDrawer({
  emailId,
  onClose,
  onAttachToMatter,
  onReply,
}: EmailPreviewDrawerProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: [...emailIntegrationKeys.queue(), 'preview', emailId],
    queryFn: () => emailIntegrationApi.getPreview(emailId!),
    enabled: Boolean(emailId),
  })

  const title = data?.subject?.trim() || 'Email preview'

  return (
    <Drawer
      open={Boolean(emailId)}
      onClose={onClose}
      title={title}
      className="max-w-2xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Loading email…
        </div>
      ) : isError || !data ? (
        <p className="py-8 text-center text-sm text-destructive">Could not load this email.</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
            <MetaRow label="From" value={data.sender} />
            <MetaRow label="To" value={data.recipient} />
            <MetaRow label="Date" value={formatReceived(data.receivedAt)} />
            <MetaRow label="Mailbox" value={data.mailboxConnection.emailAddress} />
            {data.hasAttachments ? (
              <div className="flex items-center gap-2 pt-1">
                <Paperclip className="size-4 text-muted-foreground" />
                <Badge variant="outline" className="normal-case">
                  Has attachments
                </Badge>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border bg-card">
            {data.bodyHtml ? (
              <iframe
                title="Email body"
                sandbox=""
                srcDoc={data.bodyHtml}
                className="min-h-[420px] w-full rounded-lg bg-white"
              />
            ) : data.bodyText ? (
              <div className="whitespace-pre-wrap p-4 text-sm leading-relaxed text-foreground">
                {data.bodyText}
              </div>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">No message body.</p>
            )}
          </div>

          <EmailAiSummary emailId={data.id} preview={data} />

          <div className="flex flex-col gap-2 sm:flex-row">
            {onReply ? (
              <PermissionGate resource="email" action="create">
                <Button className="flex-1" variant="default" onClick={onReply}>
                  <Reply className="size-4" />
                  Reply
                </Button>
              </PermissionGate>
            ) : null}
            {onAttachToMatter ? (
              <PermissionGate resource="email_queue" action="link">
                <Button
                  className="flex-1"
                  variant={onReply ? 'outline' : 'default'}
                  onClick={onAttachToMatter}
                >
                  <Link2 className="size-4" />
                  Attach to matter
                </Button>
              </PermissionGate>
            ) : null}
          </div>
        </div>
      )}
    </Drawer>
  )
}
