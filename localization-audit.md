# Localization audit (hardcoded English → i18n)

This audit is generated from targeted `rg` scans and highlights **user-visible** English strings found in the **frontend UI**:

- Hardcoded JSX text (e.g. “Failed to load …”)
- Hardcoded `title`, `aria-label`, `placeholder`
- Hardcoded confirmation labels / button labels
- Hardcoded “Yes/No” and other conditional labels
- `t(..., { defaultValue: 'English…' })` fallbacks
- Bulgarian locale values that are still Latin-script English (to verify/translate)

## 1) Hardcoded error / empty-state JSX text

- `frontend/src/pages/PrecedentsPage.tsx`
  - `Failed to load precedents.`
- `frontend/src/pages/matters/MatterLayout.tsx`
  - `Matter not found.`
- `frontend/src/pages/matters/tabs/MatterCustomsTab.tsx`
  - `No custody entries yet.`
  - `Failed to load seizures.`
  - `No AFAs recorded yet.`
  - `Failed to load seizures.` (if shown in multiple states)
- `frontend/src/pages/matters/tabs/MatterCorrespondenceTab.tsx`
  - `Failed to load correspondence.`
  - `From:`
- `frontend/src/components/layout/ShellMenus.tsx`
  - `Could not load notifications.`
  - `No notifications yet.`
- `frontend/src/pages/crm/clients/tabs/ClientBillingTab.tsx`
  - `Failed to load billing data.`
- `frontend/src/pages/documents/StaffDocumentsPage.tsx`
  - `No permission.`
  - `Failed to load documents.`
- `frontend/src/pages/compliance/ConsentRegisterPage.tsx`
  - `No permission.`
  - `Failed to load consent records.`
  - `No clients found.`
  - `Yes` / `No` (for GDPR consent)
- `frontend/src/pages/billing/TimeEntriesPage.tsx`
  - `Failed to load time entries.`
- `frontend/src/pages/billing/DisbursementsPage.tsx`
  - `No permission.`
  - `Failed to load disbursements.`
- `frontend/src/components/matters/MattersTable.tsx`
  - `Failed to load matters.`
- `frontend/src/pages/matters/tabs/MatterIpRightsTab.tsx`
  - `Application no.`

## 2) Hardcoded `aria-label` / `title` / `placeholder`

### aria-label

- `frontend/src/pages/matters/tabs/MatterBillingTab.tsx`
  - `Billable`
  - `Non-billable`
- `frontend/src/components/layout/AppTopbar.tsx`
  - `Tasks`
- `frontend/src/pages/compliance/RetentionRulesPage.tsx`
  - `Dry-run retention rule`
  - `Edit retention rule`
- `frontend/src/features/deadlines/components/DeadlineExplanationButton.tsx`
  - `Explain deadline`
- `frontend/src/features/ai-assistant/components/AiAssistantPanel.tsx`
  - `AI assistant`
  - `Close assistant`
- `frontend/src/features/invoices/components/InvoiceListTable.tsx`
  - `Download invoice`
- `frontend/src/components/intake/CounterpartiesSection.tsx`
  - `Remove counterparty`
- `frontend/src/components/layout/GlobalSearch.tsx`
  - `Global search`
  - `Clear search`
- `frontend/src/pages/portal/PortalMessagesPage.tsx`
  - `Unread`
- `frontend/src/components/intake/CounterpartiesEditor.tsx`
  - `Remove party`
- `frontend/src/components/feedback/AppAlertDialog.tsx`
  - `Dismiss dialog backdrop`
  - `Close`
- `frontend/src/pages/email-queue/EmailQueuePage.tsx`
  - `View email`
  - `Reply`
  - `Attach to matter correspondence`
  - `Download .eml`

### Drawer / popover / title props

- `frontend/src/features/email-integration/components/AttachFromEmailQueueDrawer.tsx`
  - `Attach from email queue`
- `frontend/src/pages/crm/clients/tabs/OfficesTab.tsx`
  - `Add office`
- `frontend/src/pages/matters/tabs/MatterCorrespondenceTab.tsx`
  - `Open on EPO Register`
  - `Open official record on EPO Register`
  - `Reply via connected mailbox`
  - `Save as draft precedent`
- `frontend/src/pages/compliance/RetentionRulesPage.tsx`
  - `Dry run`
- `frontend/src/pages/crm/clients/tabs/ContactsTab.tsx`
  - `Add contact`
- `frontend/src/components/layout/AppTopbar.tsx`
  - `Coming soon`
- `frontend/src/features/precedents/components/SaveAsPrecedentDrawer.tsx`
  - `Save as precedent`
- `frontend/src/pages/matters/tabs/MatterDocumentsTab.tsx`
  - `Upload document`
  - `Generate document`
- `frontend/src/components/correspondence/LogCorrespondenceDrawer.tsx`
  - `Log correspondence`
- `frontend/src/pages/matters/tabs/MatterTasksTab.tsx`
  - `Add task`
- `frontend/src/components/matters/CreateMatterDrawer.tsx`
  - `Open new matter`
- `frontend/src/pages/email-queue/EmailQueuePage.tsx`
  - `View email`
  - `Reply`
  - `Attach to matter correspondence`
  - `Download .eml`
- `frontend/src/features/email-integration/components/ReplyComposerDrawer.tsx`
  - `Reply`
- `frontend/src/pages/matters/tabs/MatterIpRightsTab.tsx`
  - `Add IP right`
  - `File application`
  - `Register IP right`
  - `Split renewal`
- `frontend/src/components/correspondence/LogEmailDrawer.tsx`
  - `Log email`
- `frontend/src/components/crm/AddRelatedCompanyDrawer.tsx`
  - `Add related company`
- `frontend/src/features/deadlines/components/CreateDeadlineDrawer.tsx`
  - `New deadline`
- `frontend/src/pages/matters/tabs/MatterCustomsTab.tsx`
  - `Log customs seizure`
  - `Seizure detail`
- `frontend/src/features/email-integration/components/EmailPreviewDrawer.tsx`
  - `Email body`

### placeholder

The following placeholders appear as raw English string literals and should be moved to i18n keys:

- `frontend/src/features/email-integration/components/AttachFromEmailQueueDrawer.tsx`
  - `sender@example.com`, `recipient@firm.com`, `Email subject`
- `frontend/src/pages/settings/DocumentTemplatesPage.tsx`
  - `filing-cover-letter`
- `frontend/src/pages/matters/tabs/MatterDocumentsTab.tsx`
  - `Search name or tags…`
  - `All categories`
  - `e.g. BPO Filing Package - Final`
  - `urgent, bpo, client-approved`
- `frontend/src/features/auth/MfaEnrollmentCard.tsx`
  - `000000 or XXXX-XXXX`
- `frontend/src/components/matters/CreateMatterDrawer.tsx`
  - `e.g. Acme Dron trademark - EU`
  - `Brief scope of the legal work`
  - `Add country…`
- `frontend/src/pages/documents/StaffDocumentsPage.tsx`
  - `Search documents…`
- `frontend/src/pages/matters/tabs/MatterCustomsTab.tsx`
  - `Search matters to escalate…`
  - `Notes (optional)`
  - `None`
- `frontend/src/features/retainers/components/ClientRetainerCard.tsx`
  - `Q3 retainer top-up`
- `frontend/src/pages/settings/IntegrationsSettingsPage.tsx`
  - `https://ops.epo.org/3.2/rest-services`
  - `https://ops.epo.org/3.2/auth/accesstoken`
- `frontend/src/features/ai-assistant/components/ToolParamFields.tsx`
  - `Choose a matter`, `Choose correspondence`, `Choose a queued email`
- `frontend/src/components/intake/CounterpartiesEditor.tsx`
  - `Person or entity name`
  - `Company on the other side`
- `frontend/src/features/precedents/components/SaveAsPrecedentDrawer.tsx`
  - `Optional`
- `frontend/src/components/ui/rich-text-editor.tsx`
  - `Start writing…`
- `frontend/src/features/precedents/components/InsertPrecedentPicker.tsx`
  - `Search published precedents…`
- `frontend/src/components/layout/GlobalSearch.tsx`
  - `Search clients, matters, emails…`
- `frontend/src/pages/matters/tabs/MatterTasksTab.tsx`
  - `e.g. Call client re: BPO response`
  - `Any extra context for the assignee`
- `frontend/src/pages/crm/clients/tabs/ClientOverviewTab.tsx`
  - `https://`
  - `None`
- `frontend/src/components/crm/CreateHoldingGroupForm.tsx`
  - `e.g. Acme Group BV`
  - `Optional notes about this holding structure`
- `frontend/src/pages/finance/RateCardsPage.tsx`
  - `Optional - for margin reporting`
- `frontend/src/components/crm/CountrySelect.tsx`
  - `Select country`, `Search countries…`

## 3) Hardcoded defaultValue fallbacks (English)

These `t(..., { defaultValue: 'English...' })` entries can show English when keys are missing in `bg`:

- `frontend/src/pages/compliance/ConsentRegisterPage.tsx`
  - `consent.title` defaultValue: `Consent records`
  - GDPR status defaultValue: `GDPR consent status across clients.`
- `frontend/src/components/watch/WatchAlertsTable.tsx`
  - defaultValue: `Actions`
- `frontend/src/pages/billing/TimeEntriesPage.tsx`
  - `common:noPermission` defaultValue: `No permission.`
- `frontend/src/pages/portal/PortalHelpPage.tsx`
  - `Help`, `How to use the client portal for your IP portfolio.`, `File an enquiry`, `Open enquiries`, `Approvals`, `Open approvals`, `Need more help?`, `Open messages`
- `frontend/src/pages/portal/PortalMessagesPage.tsx`
  - `Messages`, `Loading messages…`, `Failed to load messages.`, `No messages yet...`,
  - `Type`, `Subject`, `Date`, `Matter`,
  - `Select a message to read it.`, `Opening…`, etc.

## 4) Bulgarian locale values still containing Latin-script English

The Bulgarian locale still includes Latin-script strings that look English (likely keys reused without translation):

- `frontend/public/locales/bg/settings.json`
  - `Client ID`, `Client secret`, `Tenant ID`, `Redirect URI`,
  - provider descriptions containing `Client secrets`, `Settings`, `Consumer key`, etc.

## Notes

- This audit focuses on matches found by our scans. After we translate these hits, we can re-run scans to ensure no remaining user-visible English strings in the frontend.

