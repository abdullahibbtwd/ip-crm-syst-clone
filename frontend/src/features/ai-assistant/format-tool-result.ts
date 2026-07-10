function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

function str(value: unknown, fallback = '—'): string {
  if (value == null || value === '') return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' && !(value instanceof Date)) return str(value)
  const d = new Date(value as string)
  if (Number.isNaN(d.getTime())) return str(value)
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(d)
}

function clientLabel(client: unknown): string {
  const c = asRecord(client)
  if (!c) return '—'
  return (
    str(c.companyName, '') ||
    [c.firstName, c.lastName].filter(Boolean).join(' ') ||
    str(c.internalCode) ||
    '—'
  )
}

function personLabel(person: unknown): string {
  const p = asRecord(person)
  if (!p) return '—'
  return str(p.fullName) || str(p.email) || '—'
}

function formatDeadlines(result: unknown): string {
  const rows = Array.isArray(result) ? result : []
  if (rows.length === 0) {
    return '## Active deadlines\n\nNo active deadlines for this matter.'
  }

  const lines = [`## Active deadlines (${rows.length})`, '']
  for (const row of rows) {
    const d = asRecord(row)
    if (!d) continue
    lines.push(`### ${str(d.title, 'Untitled deadline')}`)
    lines.push(`- **Due:** ${formatDate(d.dueDate)}`)
    if (d.graceDate) lines.push(`- **Grace:** ${formatDate(d.graceDate)}`)
    lines.push(`- **Status:** ${str(d.status)}`)
    lines.push(`- **Assigned to:** ${personLabel(d.assignedTo)}`)
    if (d.jurisdiction) lines.push(`- **Jurisdiction:** ${str(d.jurisdiction)}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

function formatCorrespondence(result: unknown): string {
  const rows = Array.isArray(result) ? result : []
  if (rows.length === 0) {
    return '## Correspondence\n\nNo correspondence on this matter yet.'
  }

  const lines = [`## Correspondence (${rows.length})`, '']
  for (const row of rows) {
    const c = asRecord(row)
    if (!c) continue
    lines.push(`### ${str(c.subject, '(No subject)')}`)
    lines.push(`- **Direction:** ${str(c.direction)}`)
    lines.push(`- **From:** ${str(c.sender)}`)
    lines.push(`- **To:** ${str(c.recipient)}`)
    lines.push(`- **Date:** ${formatDate(c.correspondenceDate)}`)
    lines.push(`- **Status:** ${str(c.status)}`)
    if (c.category) lines.push(`- **Category:** ${str(c.category)}`)
    const body = str(c.bodyText, '')
    if (body) {
      const preview = body.replace(/\s+/g, ' ').trim().slice(0, 220)
      lines.push(`- **Preview:** ${preview}${body.length > 220 ? '…' : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

function formatMatterDetail(result: unknown): string {
  const m = asRecord(result)
  if (!m) return '## Matter\n\nNo matter details returned.'

  const lines = [`## ${str(m.title, 'Matter')}`, '']
  lines.push(`- **Type:** ${str(m.matterType)}`)
  lines.push(`- **Status:** ${str(m.status)}`)
  lines.push(`- **Client:** ${clientLabel(m.client)}`)
  lines.push(`- **Attorney:** ${personLabel(m.assignedTo)}`)

  const jurisdictions = Array.isArray(m.jurisdictions) ? m.jurisdictions : []
  if (jurisdictions.length > 0) {
    const codes = jurisdictions
      .map((j) => asRecord(j)?.countryCode)
      .filter(Boolean)
      .join(', ')
    lines.push(`- **Jurisdictions:** ${codes || '—'}`)
  }

  if (m.description) {
    lines.push('')
    lines.push(str(m.description))
  }

  return lines.join('\n').trim()
}

function formatDraftReply(result: unknown): string {
  const d = asRecord(result)
  if (!d) return '## Draft reply\n\nNo draft was generated.'

  const to = Array.isArray(d.to) ? d.to.map(String).join(', ') : str(d.to)
  const lines = ['## Draft reply', '']
  lines.push(`- **To:** ${to || '—'}`)
  lines.push(`- **Subject:** ${str(d.subject)}`)
  if (d.usedAi) lines.push('- **Generated with:** AI')
  lines.push('')
  lines.push('### Message')
  lines.push('')
  lines.push(str(d.bodyText, '(Empty draft)'))
  return lines.join('\n').trim()
}

function formatGeneric(result: unknown): string {
  if (result == null) return '_No result._'
  if (typeof result === 'string') return result
  if (typeof result === 'number' || typeof result === 'boolean') {
    return String(result)
  }
  if (Array.isArray(result)) {
    if (result.length === 0) return '_Empty list._'
    const lines = [`## Results (${result.length})`, '']
    result.forEach((item, i) => {
      const rec = asRecord(item)
      if (rec) {
        const title =
          str(rec.title, '') ||
          str(rec.subject, '') ||
          str(rec.name, '') ||
          `Item ${i + 1}`
        lines.push(`### ${title}`)
        for (const [key, value] of Object.entries(rec)) {
          if (key === 'title' || key === 'subject' || key === 'name') continue
          if (value == null || typeof value === 'object') continue
          lines.push(`- **${key}:** ${String(value)}`)
        }
        lines.push('')
      } else {
        lines.push(`- ${String(item)}`)
      }
    })
    return lines.join('\n').trim()
  }

  const rec = asRecord(result)
  if (!rec) return String(result)

  const lines = ['## Result', '']
  for (const [key, value] of Object.entries(rec)) {
    if (value == null || typeof value === 'object') continue
    lines.push(`- **${key}:** ${String(value)}`)
  }
  return lines.join('\n').trim()
}

/** Convert an MCP tool payload into user-facing markdown. */
export function formatMcpResultMarkdown(toolName: string, result: unknown): string {
  switch (toolName) {
    case 'get_matter_deadlines':
      return formatDeadlines(result)
    case 'list_correspondence':
      return formatCorrespondence(result)
    case 'get_matter_detail':
      return formatMatterDetail(result)
    case 'generate_draft_reply':
      return formatDraftReply(result)
    default:
      return formatGeneric(result)
  }
}

export const MCP_TOOL_LABELS: Record<string, string> = {
  get_matter_deadlines: 'Matter deadlines',
  list_correspondence: 'Correspondence',
  get_matter_detail: 'Matter details',
  generate_draft_reply: 'AI draft reply',
}

export function mcpToolLabel(name: string): string {
  return MCP_TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
}
