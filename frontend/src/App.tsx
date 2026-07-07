import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { ClientListPage } from './pages/crm/ClientListPage'
import { CreateHoldingGroupPage } from './pages/crm/CreateHoldingGroupPage'
import { HoldingGroupDetailPage } from './pages/crm/HoldingGroupDetailPage'
import { HoldingGroupListPage } from './pages/crm/HoldingGroupListPage'
import { ClientLayout } from './pages/crm/clients/ClientLayout'
import { ClientOverviewTab } from './pages/crm/clients/tabs/ClientOverviewTab'
import { ContactsTab } from './pages/crm/clients/tabs/ContactsTab'
import { OfficesTab } from './pages/crm/clients/tabs/OfficesTab'
import { ClientBillingTab } from './pages/crm/clients/tabs/ClientBillingTab'
import { MattersTab } from './pages/crm/clients/tabs/MattersTab'
import { RelatedCompaniesTab } from './pages/crm/clients/tabs/RelatedCompaniesTab'
import { RelationshipHistoryTab } from './pages/crm/clients/tabs/RelationshipHistoryTab'
import { SettingsPage } from './pages/settings/SettingsPage'
import { CreateIntakePage } from './pages/intake/CreateIntakePage'
import { IntakeDetailPage } from './pages/intake/IntakeDetailPage'
import { IntakeListPage } from './pages/intake/IntakeListPage'
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
import { MyDeadlinesPage } from './pages/deadlines/MyDeadlinesPage'
import { AllDeadlinesPage } from './pages/deadlines/AllDeadlinesPage'
import { RenewalsPage } from './pages/renewals/RenewalsPage'
import { UsersLayout, UsersIndexRedirect } from './pages/users/UsersLayout'
import { TeamUsersTab } from './pages/users/TeamUsersTab'
import { PortalUsersTab } from './pages/users/PortalUsersTab'
import { PortalIntakePage } from './pages/portal/PortalIntakePage'
import { PortalIntakeDetailPage } from './pages/portal/PortalIntakeDetailPage'
import { PortalDocumentsPage } from './pages/portal/PortalDocumentsPage'
import { PortalInvoicesPage } from './pages/portal/PortalInvoicesPage'
import { PortalRenewalsPage } from './pages/portal/PortalRenewalsPage'
import { InvoicesListPage } from './pages/finance/InvoicesListPage'
import { RateCardsPage } from './pages/finance/RateCardsPage'
import { DeadlineRiskReportPage } from './pages/reports/DeadlineRiskReportPage'
import { RevenueSummaryReportPage } from './pages/reports/RevenueSummaryReportPage'
import { FilingVolumesReportPage } from './pages/reports/FilingVolumesReportPage'
import { RenewalsSummaryReportPage } from './pages/reports/RenewalsSummaryReportPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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

          <Route path="/clients" element={<ClientListPage />} />
          <Route path="/clients/new" element={<Navigate to="/intake/new" replace />} />
          <Route path="/clients/:id" element={<ClientLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ClientOverviewTab />} />
            <Route path="offices" element={<OfficesTab />} />
            <Route path="contacts" element={<ContactsTab />} />
            <Route path="related" element={<RelatedCompaniesTab />} />
            <Route path="history" element={<RelationshipHistoryTab />} />
            <Route path="matters" element={<MattersTab />} />
            <Route path="billing" element={<ClientBillingTab />} />
          </Route>

          <Route path="/holding-groups" element={<HoldingGroupListPage />} />
          <Route path="/holding-groups/new" element={<CreateHoldingGroupPage />} />
          <Route path="/holding-groups/:id" element={<HoldingGroupDetailPage />} />

          <Route path="/settings" element={<SettingsPage />} />

          <Route path="/users" element={<UsersLayout />}>
            <Route index element={<UsersIndexRedirect />} />
            <Route path="team" element={<TeamUsersTab />} />
            <Route path="portal" element={<PortalUsersTab />} />
          </Route>

          <Route path="/intake" element={<IntakeListPage />} />
          <Route path="/intake/new" element={<CreateIntakePage />} />
          <Route path="/intake/:id" element={<IntakeDetailPage />} />

          <Route path="/matters" element={<MatterListPage />} />
          <Route path="/invoices" element={<InvoicesListPage />} />
          <Route path="/rate-cards" element={<RateCardsPage />} />
          <Route path="/deadlines/my" element={<MyDeadlinesPage />} />
          <Route path="/deadlines" element={<AllDeadlinesPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/reports/deadline-risk" element={<DeadlineRiskReportPage />} />
          <Route path="/reports/revenue-summary" element={<RevenueSummaryReportPage />} />
          <Route path="/reports/filing-volumes" element={<FilingVolumesReportPage />} />
          <Route path="/reports/renewals-summary" element={<RenewalsSummaryReportPage />} />
          <Route path="/matters/:id" element={<MatterLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<MatterOverviewTab />} />
            <Route path="timeline" element={<MatterTimelineTab />} />
            <Route path="documents" element={<MatterDocumentsTab />} />
            <Route path="correspondence" element={<MatterCorrespondenceTab />} />
            <Route path="deadlines" element={<MatterDeadlinesTab />} />
            <Route path="tasks" element={<MatterTasksTab />} />
            <Route path="billing" element={<MatterBillingTab />} />
            <Route path="ip-rights" element={<MatterIpRightsTab />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
