import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AcceptInvitePage } from './pages/AcceptInvitePage'
import { ClientListPage } from './pages/crm/ClientListPage'
import { CreateClientPage } from './pages/crm/CreateClientPage'
import { CreateHoldingGroupPage } from './pages/crm/CreateHoldingGroupPage'
import { GlobalContactsPage } from './pages/crm/GlobalContactsPage'
import { HoldingGroupDetailPage } from './pages/crm/HoldingGroupDetailPage'
import { HoldingGroupListPage } from './pages/crm/HoldingGroupListPage'
import { ClientLayout } from './pages/crm/clients/ClientLayout'
import { ClientOverviewTab } from './pages/crm/clients/tabs/ClientOverviewTab'
import { ContactsTab } from './pages/crm/clients/tabs/ContactsTab'
import { OfficesTab } from './pages/crm/clients/tabs/OfficesTab'
import { ClientBillingTab } from './pages/crm/clients/tabs/ClientBillingTab'
import { MattersTab } from './pages/crm/clients/tabs/MattersTab'
import { ClientDocumentsTab } from './pages/crm/clients/tabs/ClientDocumentsTab'
import { ClientCorrespondenceTab } from './pages/crm/clients/tabs/ClientCorrespondenceTab'
import { ClientWatchTab } from './pages/crm/clients/tabs/ClientWatchTab'
import { ClientAccessHistoryTab } from './pages/crm/clients/tabs/ClientAccessHistoryTab'
import { ClientNotesTab } from './pages/crm/clients/tabs/ClientNotesTab'
import { RelatedCompaniesTab } from './pages/crm/clients/tabs/RelatedCompaniesTab'
import { RelationshipHistoryTab } from './pages/crm/clients/tabs/RelationshipHistoryTab'
import { SettingsPage } from './pages/settings/SettingsPage'
import { EmailIntegrationSettingsPage } from './pages/settings/EmailIntegrationSettingsPage'
import { IntegrationsSettingsPage } from './pages/settings/IntegrationsSettingsPage'
import { SsoMfaSettingsPage } from './pages/settings/SsoMfaSettingsPage'
import { RolesPermissionsPage } from './pages/settings/RolesPermissionsPage'
import { SystemHealthPage } from './pages/settings/SystemHealthPage'
import { DeadlineRulesPage } from './pages/settings/DeadlineRulesPage'
import { DocumentTemplatesPage } from './pages/settings/DocumentTemplatesPage'
import { PrecedentsPage } from './pages/PrecedentsPage'
import { HolidaysPage } from './pages/settings/HolidaysPage'
import { JurisdictionsPage } from './pages/settings/JurisdictionsPage'
import { JurisdictionDetailPage } from './pages/settings/JurisdictionDetailPage'
import { TimeEntriesPage } from './pages/billing/TimeEntriesPage'
import { DisbursementsPage } from './pages/billing/DisbursementsPage'
import { ConsentRegisterPage } from './pages/compliance/ConsentRegisterPage'
import { StaffDocumentsPage } from './pages/documents/StaffDocumentsPage'
import { GeneratePoaPage } from './pages/documents/GeneratePoaPage'
import { PortalHelpPage } from './pages/portal/PortalHelpPage'
import { EmailQueuePage } from './pages/email-queue/EmailQueuePage'
import { BroadcastsPage } from './pages/broadcasts/BroadcastsPage'
import { CreateIntakePage } from './pages/intake/CreateIntakePage'
import { IntakeDetailPage } from './pages/intake/IntakeDetailPage'
import { IntakeListPage } from './pages/intake/IntakeListPage'
import { CreateTrademarkFilePage } from './pages/create-file/CreateTrademarkFilePage'
import { CreatePatentFilePage } from './pages/create-file/CreatePatentFilePage'
import { CreateDesignFilePage } from './pages/create-file/CreateDesignFilePage'
import { CreateUtilityModelFilePage } from './pages/create-file/CreateUtilityModelFilePage'
import { CreateGiFilePage } from './pages/create-file/CreateGiFilePage'
import { CreateSpcFilePage } from './pages/create-file/CreateSpcFilePage'
import { CreateCaseFilePage } from './pages/create-file/CreateCaseFilePage'
import { CreateOtherMatterPickerPage } from './pages/create-file/CreateOtherMatterPickerPage'
import { CreateOtherMatterFilePage } from './pages/create-file/CreateOtherMatterFilePage'
import { CreateFileComingSoonPage } from './pages/create-file/CreateFileComingSoonPage'
import { MatterListPage } from './pages/matters/MatterListPage'
import { MatterLayout } from './pages/matters/MatterLayout'
import { MatterIpRightsTab } from './pages/matters/tabs/MatterIpRightsTab'
import { MatterOverviewTab } from './pages/matters/tabs/MatterOverviewTab'
import { MatterDeadlinesTab } from './pages/matters/tabs/MatterDeadlinesTab'
import { MatterDocumentsTab } from './pages/matters/tabs/MatterDocumentsTab'
import { MatterCorrespondenceTab } from './pages/matters/tabs/MatterCorrespondenceTab'
import { MatterTimelineTab } from './pages/matters/tabs/MatterTimelineTab'
import { MatterBillingTab } from './pages/matters/tabs/MatterBillingTab'
import { MatterTasksTab } from './pages/matters/tabs/MatterTasksTab'
import { MatterInstructionsTab } from './pages/matters/tabs/MatterInstructionsTab'
import { MatterApprovalsTab } from './pages/matters/tabs/MatterApprovalsTab'
import { MatterCustomsTab } from './pages/matters/tabs/MatterCustomsTab'
import { MatterSecondaryActionsTab } from './pages/matters/tabs/MatterSecondaryActionsTab'
import { CancellationArchiveTab } from './pages/matters/tabs/CancellationArchiveTab'
import { CancellationNotesTab } from './pages/matters/tabs/CancellationNotesTab'
import { DeletionArchiveTab } from './pages/matters/tabs/DeletionArchiveTab'
import { ObjectionArchiveTab } from './pages/matters/tabs/ObjectionArchiveTab'
import { OppositionArchiveTab } from './pages/matters/tabs/OppositionArchiveTab'
import { OppositionNotesTab } from './pages/matters/tabs/OppositionNotesTab'
import { PartnersListPage } from './pages/partners/PartnersListPage'
import { MyDeadlinesPage } from './pages/deadlines/MyDeadlinesPage'
import { AllDeadlinesPage } from './pages/deadlines/AllDeadlinesPage'
import { AlertsPage } from './pages/alerts/AlertsPage'
import { IpRightsPage } from './pages/ip-rights/IpRightsPage'
import { RenewalsPage } from './pages/renewals/RenewalsPage'
import { WatchAlertsPage } from './pages/watch/WatchAlertsPage'
import { WatchAlertDetailPage } from './pages/watch/WatchAlertDetailPage'
import { UsersLayout, UsersIndexRedirect } from './pages/users/UsersLayout'
import { TeamUsersTab } from './pages/users/TeamUsersTab'
import { PortalUsersTab } from './pages/users/PortalUsersTab'
import { PortalIntakePage } from './pages/portal/PortalIntakePage'
import { PortalIntakeDetailPage } from './pages/portal/PortalIntakeDetailPage'
import { PortalDocumentsPage } from './pages/portal/PortalDocumentsPage'
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage'
import { PortalRenewalsPage } from './pages/portal/PortalRenewalsPage'
import { PortalCorrespondencePage } from './pages/portal/PortalCorrespondencePage'
import { PortalMessagesPage } from './pages/portal/PortalMessagesPage'
import { PortalApprovalsPage } from './pages/portal/PortalApprovalsPage'
import { InvoicesListPage } from './pages/finance/InvoicesListPage'
import { RateCardsPage } from './pages/finance/RateCardsPage'
import { BillingOverviewPage } from './pages/finance/BillingOverviewPage'
import { DeadlineRiskReportPage } from './pages/reports/DeadlineRiskReportPage'
import { RevenueSummaryReportPage } from './pages/reports/RevenueSummaryReportPage'
import { FilingVolumesReportPage } from './pages/reports/FilingVolumesReportPage'
import { BpoOwnersPage } from './pages/reports/BpoOwnersPage'
import { RenewalsSummaryReportPage } from './pages/reports/RenewalsSummaryReportPage'
import { AuditTrailPage } from './pages/compliance/AuditTrailPage'
import { DataExportsPage } from './pages/compliance/DataExportsPage'
import { RetentionRulesPage } from './pages/compliance/RetentionRulesPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/portal/intake" element={<PortalIntakePage />} />
          <Route
            path="/portal/intake/new"
            element={<Navigate to="/portal/intake?tab=new" replace />}
          />
          <Route path="/portal/intake/:id" element={<PortalIntakeDetailPage />} />
          <Route path="/portal/documents" element={<PortalDocumentsPage />} />
          <Route path="/portal/invoices" element={<PortalInvoicesPage />} />
          <Route path="/portal/renewals" element={<PortalRenewalsPage />} />
          <Route path="/portal/messages" element={<PortalMessagesPage />} />
          <Route path="/portal/correspondence" element={<PortalCorrespondencePage />} />
          <Route path="/portal/approvals" element={<PortalApprovalsPage />} />

          <Route path="/clients" element={<ClientListPage />} />
          <Route path="/clients/new" element={<CreateClientPage />} />
          <Route path="/contacts" element={<GlobalContactsPage />} />
          <Route path="/clients/:id" element={<ClientLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ClientOverviewTab />} />
            <Route path="offices" element={<OfficesTab />} />
            <Route path="contacts" element={<ContactsTab />} />
            <Route path="related" element={<RelatedCompaniesTab />} />
            <Route path="history" element={<RelationshipHistoryTab />} />
            <Route path="matters" element={<MattersTab />} />
            <Route path="documents" element={<ClientDocumentsTab />} />
            <Route path="correspondence" element={<ClientCorrespondenceTab />} />
            <Route path="watch" element={<ClientWatchTab />} />
            <Route path="billing" element={<ClientBillingTab />} />
            <Route path="notes" element={<ClientNotesTab />} />
            <Route path="access" element={<ClientAccessHistoryTab />} />
          </Route>

          <Route path="/holding-groups" element={<HoldingGroupListPage />} />
          <Route path="/holding-groups/new" element={<CreateHoldingGroupPage />} />
          <Route path="/holding-groups/:id" element={<HoldingGroupDetailPage />} />

          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/email" element={<EmailIntegrationSettingsPage />} />
          <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
          <Route path="/settings/sso-mfa" element={<SsoMfaSettingsPage />} />
          <Route path="/settings/roles" element={<RolesPermissionsPage />} />
          <Route path="/settings/system-health" element={<SystemHealthPage />} />
          <Route path="/settings/jurisdictions" element={<JurisdictionsPage />} />
          <Route
            path="/settings/jurisdictions/:code"
            element={<JurisdictionDetailPage />}
          />
          <Route path="/settings/deadline-rules" element={<DeadlineRulesPage />} />
          <Route path="/settings/holidays" element={<HolidaysPage />} />
          <Route path="/settings/document-templates" element={<DocumentTemplatesPage />} />
          <Route path="/email-queue" element={<EmailQueuePage />} />
          <Route path="/broadcasts" element={<BroadcastsPage />} />
          <Route path="/partners" element={<PartnersListPage />} />
          <Route path="/time-entries" element={<TimeEntriesPage />} />
          <Route path="/disbursements" element={<DisbursementsPage />} />
          <Route path="/documents" element={<StaffDocumentsPage />} />
          <Route path="/documents/generate-poa" element={<GeneratePoaPage />} />
          <Route path="/compliance/consent" element={<ConsentRegisterPage />} />
          <Route path="/portal/help" element={<PortalHelpPage />} />
          <Route path="/users" element={<UsersLayout />}>
            <Route index element={<UsersIndexRedirect />} />
            <Route path="team" element={<TeamUsersTab />} />
            <Route path="portal" element={<PortalUsersTab />} />
          </Route>

          <Route path="/intake" element={<IntakeListPage />} />
          <Route path="/intake/new" element={<CreateIntakePage />} />
          <Route path="/intake/:id" element={<IntakeDetailPage />} />

          <Route path="/files/new/trademark" element={<CreateTrademarkFilePage />} />
          <Route path="/files/new/patent" element={<CreatePatentFilePage />} />
          <Route path="/files/new/design" element={<CreateDesignFilePage />} />
          <Route path="/files/new/utility-model" element={<CreateUtilityModelFilePage />} />
          <Route path="/files/new/gi" element={<CreateGiFilePage />} />
          <Route path="/files/new/spc" element={<CreateSpcFilePage />} />
          <Route path="/files/new/case" element={<CreateCaseFilePage />} />
          <Route path="/files/new/other" element={<CreateOtherMatterPickerPage />} />
          <Route path="/files/new/other/:slug" element={<CreateOtherMatterFilePage />} />
          <Route path="/files/new/:kind" element={<CreateFileComingSoonPage />} />
          <Route path="/matters" element={<MatterListPage />} />
          <Route path="/invoices" element={<InvoicesListPage />} />
          <Route path="/rate-cards" element={<RateCardsPage />} />
          <Route path="/billing-overview" element={<BillingOverviewPage />} />
          <Route path="/deadlines/my" element={<MyDeadlinesPage />} />
          <Route path="/deadlines" element={<AllDeadlinesPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/ip-rights" element={<IpRightsPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/watch-alerts" element={<WatchAlertsPage />} />
          <Route path="/watch-alerts/:id" element={<WatchAlertDetailPage />} />
          <Route path="/precedents" element={<PrecedentsPage />} />
          <Route path="/reports/deadline-risk" element={<DeadlineRiskReportPage />} />
          <Route path="/reports/revenue-summary" element={<RevenueSummaryReportPage />} />
          <Route path="/reports/filing-volumes" element={<FilingVolumesReportPage />} />
          <Route path="/reports/renewals-summary" element={<RenewalsSummaryReportPage />} />
          <Route path="/reports/bpo-owners" element={<BpoOwnersPage />} />
          <Route path="/compliance/audit-trail" element={<AuditTrailPage />} />
          <Route path="/compliance/data-exports" element={<DataExportsPage />} />
          <Route path="/compliance/retention" element={<RetentionRulesPage />} />
          <Route path="/matters/:id" element={<MatterLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<MatterOverviewTab />} />
            <Route path="objection-archive" element={<ObjectionArchiveTab />} />
            <Route path="cancellation-archive" element={<CancellationArchiveTab />} />
            <Route path="cancellation-notes" element={<CancellationNotesTab />} />
            <Route path="deletion-archive" element={<DeletionArchiveTab />} />
            <Route path="opposition-archive" element={<OppositionArchiveTab />} />
            <Route path="opposition-notes" element={<OppositionNotesTab />} />
            <Route path="timeline" element={<MatterTimelineTab />} />
            <Route path="documents" element={<MatterDocumentsTab />} />
            <Route path="correspondence" element={<MatterCorrespondenceTab />} />
            <Route path="deadlines" element={<MatterDeadlinesTab />} />
            <Route path="tasks" element={<MatterTasksTab />} />
            <Route path="billing" element={<MatterBillingTab />} />
            <Route path="ip-rights" element={<MatterIpRightsTab />} />
            <Route path="secondary-actions" element={<MatterSecondaryActionsTab />} />
            <Route path="customs" element={<MatterCustomsTab />} />
            <Route path="instructions" element={<MatterInstructionsTab />} />
            <Route path="approvals" element={<MatterApprovalsTab />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
