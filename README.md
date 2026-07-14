# IP Consulting CRM

A full-stack platform for IP consulting firms: clients and intake, matters and IP rights, deadlines and renewals, trademark watch, documents and mail, billing and invoicing, reporting, and a client portal.

This README is a readable overview of what is implemented. For deep technical detail see [`docs/auth.md`](docs/auth.md). For staff and client how-to guidance see [`docs/platform-guidelines.md`](docs/platform-guidelines.md).

---

## What it does

| Area | Highlights |
| --- | --- |
| **Identity & access** | Cookie-based sessions, 10 seeded roles, permissions, SSO (Google / Microsoft), MFA with backup codes, audit trail |
| **CRM** | Clients, offices, contacts, holding groups, related companies, relationship history |
| **Intake** | Firm and portal enquiries, fuzzy conflict check, convert to matter + client |
| **Matters & IP** | Matter types from trademarks to border measures, filing, registration, firm-wide IP register |
| **Deadlines** | Rule-based docketing, business-day math with holidays, worklists, reminders, manual create |
| **Renewals** | Instruct → file → complete, partial renewals, patent annuities, portal instructions |
| **Trademark watch** | Watch profiles, EPO OPS scan, alert triage, accept → opposition matter |
| **Documents & mail** | Upload + versions, PDF/DOCX templates, correspondence, mailbox sync, email queue, broadcasts |
| **Billing** | Rate cards, time, fixed fees, draft → issue → void invoices, PDF, retainers, accounting export/sync |
| **Portal** | Signup/login, enquiries, matters, documents, invoices, renewals, messages, approvals |
| **Reports** | Deadline risk, revenue, filings, renewals, team workload, client profitability |
| **Compliance** | Retention rules, access history, SAR export, consent register |
| **Ops** | Deadline rules, holidays, document templates, integrations (EPO, Xero/QB), system health, AI assistant |

---

## Who uses it

| Role | Focus |
| --- | --- |
| **Managing Partner** | Firm oversight, reports, compliance, full administration |
| **IP / Trademark Attorney** | Matters, filings, renewals, watch, documents, email queue |
| **Coordinator** | Intake, clients, renewals, broadcasts, operational reports |
| **Docketing Admin** | Deadlines, rules, holidays, escalations, mail queue |
| **Paralegal** | Assigned matters, documents, correspondence, precedents |
| **Finance** | Invoices, time, rates, disbursements, revenue |
| **DPO / Compliance** | Audit, retention, consent, data exports |
| **IT Admin** | Users, roles, SSO/MFA, integrations, system health |
| **Portal Client** | Own company portfolio only (enquiries, matters, docs, invoices, renewals, messages, approvals) |

Sidebar navigation is role-specific. Portal clients see a separate external theme and cannot use firm-wide search.

---

## Architecture at a glance

```
Browser (React)
  → API (httpOnly cookies)
    → Auth guards (session, roles, permissions)
    → Controllers / services
    → PostgreSQL · Redis queues · object storage
    → Audit log on mutations
```

- **Frontend:** React app with role-based shell, English / Bulgarian UI
- **Backend:** Modular API with permission checks and audit metadata
- **Data:** Relational models for CRM, matters, docketing, billing, portal, watch, compliance
- **Jobs:** Background work for deadline reminders, email sync, registry scans, retention, accounting sync, broadcasts

---

## Feature map (implemented)

### Clients & intake

- Client profiles with offices, contacts, related companies, watch, billing, and access history
- Holding groups for corporate structures
- Intake queue: enquiry → conflict check → approve/reject → convert
- Portal clients file enquiries; conversion reuses their existing client record (no duplicate company)

### Matters, IP rights & customs

- Matter lifecycle with jurisdictions and type-specific attributes
- File application → Register IP right → renewals / annuities
- Firm-wide IP rights register (browse/filter; edit on the matter)
- Border-measures: seizures, custody log, customs applications, auto deadlines
- Partner directory and matter instruction workflow (draft → sent → acknowledged → complete)
- Precedents library (draft / publish / archive; insert into correspondence)

### Deadlines & renewals

- Triggers: matter created, office action logged, renewal due, customs seizure
- Personal and firm worklists; manual deadlines (Managing Partner / Docketing)
- Reminders at 30 / 7 / 3 / 1 days before, due today, and overdue catch-up; Managing Partners get copies
- Renewal workflow with optional split by jurisdiction/class; portal proceed / decline
- Completing renewals can create fees and issue invoices

### Watch & registry

- Client watch profiles; alert worklist with similarity score
- EPO OPS: manual scan per client, nightly jobs, prosecution status, document fetch
- Accept alert → dispute/opposition matter

### Documents, correspondence & email

- Matter documents with categories, tags, version history
- Generate from templates (PDF and DOCX)
- Log correspondence or email (`.eml` / paste); office actions create deadlines
- Connect Microsoft 365 / Google mailbox → email queue → preview → link or dismiss
- Keyword auto-classification suggests category and matter on ingest
- Firm broadcasts to client audiences; copies appear in portal Messages

### Billing & finance

- Rate cards (optional internal cost for true-margin profitability)
- Time entries and fixed fees; client and matter billing summaries
- Invoices: draft → issue (PDF) → payments / void; portal sees issued invoices
- Retainers: deposit, adjust, draw down on invoices; portal balance; low-balance alerts
- Accounting CSV export (journal / Xero / QuickBooks) and live sync when credentials are set

### Portal experience

- Self-registration (email/password or SSO) with consent, or firm invite
- Dashboard, enquiries, matters (overview / documents / deadlines / billing), documents, invoices, renewals, messages, approvals, help
- Scoped by client: users only see their company’s data

### Reports & alerts

| Report | Audience |
| --- | --- |
| Deadline risk | Managing Partner, Docketing Admin |
| Revenue & receivables | Managing Partner, Finance |
| Filing volumes | Managing Partner, Coordinator |
| Renewals summary | Managing Partner, Coordinator |
| Team workload | Managing Partner (dashboard widget) |
| Client profitability | Managing Partner (dashboard widget) |

Consolidated **Alerts** page merges urgent deadlines, renewals, and notifications.

### Administration & compliance

- Users (team + portal), invite, role change, MFA reset
- SSO/MFA org settings, roles matrix (read-only), system health
- Deadline rules, holidays, document templates, integrations (EPO, accounting)
- Retention rules with dry-run, audit trail, data-exports log, consent register
- GDPR: access history, personal-data export (SAR)

### AI assistant

Optional provider (Gemini / OpenAI / Anthropic): summarize email, explain deadlines, draft replies, and tool calls via an in-app assistant.

---

## Authentication (summary)

| Topic | Behaviour |
| --- | --- |
| Session | httpOnly access + refresh cookies (not localStorage) |
| MFA | TOTP enrolment; org policy can require MFA for internal users; backup codes; admin reset |
| SSO | Google / Microsoft for login; portal signup via SSO when enabled |
| Password reset | Email flow with console fallback if SMTP is unset |
| Staff provisioning | Invite only (not public signup) |
| Portal signup | Public register on login, plus SSO signup |

Dev seed accounts and passwords are documented in [`docs/auth.md`](docs/auth.md#seed-accounts-dev) — change them before any real deployment.

---

## Local development

```powershell
docker compose -f docker-compose.dev.yml up -d   # Postgres + Redis + MinIO

cd backend
npx prisma migrate deploy
npx prisma db seed
npm run install:chrome   # for local invoice PDF generation
npm run start:dev

cd frontend
npm run dev
```

| Service | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| API | http://localhost:3002 |
| MinIO console | http://localhost:9001 |

Copy and fill environment variables from [`.env.example`](.env.example). Mailbox OAuth redirect URIs and production PDF (Chromium) notes are in [`docs/auth.md`](docs/auth.md#local-development).

---

## Documentation

| Document | Audience | Content |
| --- | --- | --- |
| [`docs/platform-guidelines.md`](docs/platform-guidelines.md) | Firm staff & portal clients | Task-oriented user guide (no developer jargon) |
| [`docs/auth.md`](docs/auth.md) | Developers & admins | Full technical platform reference (APIs, schema, env, phases) |
| [`backend/README.md`](backend/README.md) / [`frontend/README.md`](frontend/README.md) | Developers | Package-level tooling notes |

---

## Not in scope yet

These are called out in the technical docs as future work:

- EUIPO / BPO live watch connectors (EPO OPS is live)
- Embedding-based mark similarity (trigram scoring is used today)
- Runtime role-permission editor (seed-driven matrix today)
- SAML 2.0
- Native mobile apps (responsive portal web is available)

---

## Repository layout

```
├── backend/          API, jobs, database schema
├── frontend/         React application
├── docs/             Platform guidelines + technical reference
├── docker-compose*.yml
└── .env.example
```

---

_Overview distilled from the July 2026 platform documentation. Prefer `docs/auth.md` when you need exact endpoints, migrations, or environment keys._
