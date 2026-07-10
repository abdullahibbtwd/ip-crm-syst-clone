/** Extract bare email from `Name <addr@x.com>` or return trimmed input. */
export function extractEmailAddress(value: string): string {
  const match = value.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  return value.trim();
}

export function replySubject(subject: string): string {
  const trimmed = subject.trim() || '(No subject)';
  if (/^re:\s/i.test(trimmed)) return trimmed;
  return `Re: ${trimmed}`;
}

export function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div>${escaped.replace(/\n/g, '<br/>')}</div>`;
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

export type OutboundAttachment = {
  fileName: string;
  contentType: string;
  contentBase64: string;
};

export type SendMailboxMessageInput = {
  fromAddress: string;
  to: string[];
  cc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  inReplyToMessageId?: string;
  attachments?: OutboundAttachment[];
};

export type SendMailboxMessageResult = {
  providerMessageId: string | null;
};
