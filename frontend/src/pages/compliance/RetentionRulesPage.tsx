import { Link } from 'react-router-dom'
import { ReportPanel } from '@/components/reports/report-ui'

const retentionRules = [
  {
    entity: 'Rejected intake enquiries',
    retention: '24 months',
    action: 'Anonymize PII fields',
  },
  {
    entity: 'Stale unconverted intake',
    retention: '36 months',
    action: 'Anonymize PII fields',
  },
  {
    entity: 'Audit logs',
    retention: '7 years',
    action: 'Delete',
  },
]

export function RetentionRulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl md:text-3xl">Retention rules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seeded policies enforced by the nightly retention scan job. No UI editor in v1.
        </p>
      </div>

      <ReportPanel className="p-4">
        <ul className="space-y-4">
          {retentionRules.map((rule) => (
            <li
              key={rule.entity}
              className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 pb-4 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{rule.entity}</p>
                <p className="text-sm text-muted-foreground">{rule.action}</p>
              </div>
              <span className="text-sm font-semibold text-brand-green">{rule.retention}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Configure cron via <code className="rounded bg-muted px-1">RETENTION_SCAN_CRON</code> in
          the backend environment.
        </p>
      </ReportPanel>

      <p className="text-sm text-muted-foreground">
        View purge history in the{' '}
        <Link to="/compliance/audit-trail" className="text-primary hover:underline">
          audit trail
        </Link>{' '}
        (filter action: <code className="rounded bg-muted px-1">retention_rule_executed</code>).
      </p>
    </div>
  )
}
