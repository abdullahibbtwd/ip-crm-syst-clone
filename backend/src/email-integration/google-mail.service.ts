import { Injectable, Logger } from '@nestjs/common';
import { assertMailboxOk } from './mailbox-http.errors';
import {
  extractEmailAddress,
  type SendMailboxMessageInput,
  type SendMailboxMessageResult,
} from './mailbox-mail.util';
import type {
  FetchedMailboxMessage,
  FetchMailboxMessagesOptions,
} from './microsoft-mail.service';

@Injectable()
export class GoogleMailService {
  private readonly logger = new Logger(GoogleMailService.name);

  async fetchNewMessages(
    accessToken: string,
    options: FetchMailboxMessagesOptions = {},
  ): Promise<FetchedMailboxMessage[]> {
    const limit = options.limit ?? 25;
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    if (options.latestOnly) {
      listUrl.searchParams.set('labelIds', 'INBOX');
    } else {
      const afterSeconds = Math.floor(
        (options.since?.getTime() ?? Date.now() - 7 * 24 * 60 * 60 * 1000) /
          1000,
      );
      listUrl.searchParams.set('q', `after:${afterSeconds}`);
    }
    listUrl.searchParams.set('maxResults', String(limit));

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await assertMailboxOk(listRes, 'Gmail', 'list messages');

    const listJson = (await listRes.json()) as {
      messages?: Array<{ id: string }>;
    };

    const messages: FetchedMailboxMessage[] = [];
    for (const item of listJson.messages ?? []) {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=raw`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (detailRes.status === 429 || detailRes.status === 503) {
          await assertMailboxOk(detailRes, 'Gmail', `get message ${item.id}`);
        }
        if (!detailRes.ok) continue;
        const detail = (await detailRes.json()) as {
          id: string;
          internalDate?: string;
          payload?: { headers?: Array<{ name?: string; value?: string }> };
          raw?: string;
        };
        if (!detail.raw) continue;

        const rawMime = Buffer.from(
          detail.raw.replace(/-/g, '+').replace(/_/g, '/'),
          'base64',
        );
        const headers = new Map(
          (detail.payload?.headers ?? []).map((h) => [
            (h.name ?? '').toLowerCase(),
            h.value ?? '',
          ]),
        );

        messages.push({
          externalMessageId: detail.id,
          internetMessageId: headers.get('message-id') ?? null,
          rawMime,
          sender: headers.get('from') ?? 'Unknown sender',
          recipient: headers.get('to') ?? 'Unknown recipient',
          subject: headers.get('subject')?.trim() || '(No subject)',
          receivedAt: detail.internalDate
            ? new Date(Number(detail.internalDate))
            : new Date(),
          hasAttachments: rawMime
            .toString('utf8')
            .toLowerCase()
            .includes('content-disposition: attachment'),
        });
      } catch (err) {
        if (err && typeof err === 'object' && 'name' in err) {
          const name = (err as { name: string }).name;
          if (name === 'MailboxRateLimitError' || name === 'MailboxAuthError') {
            throw err;
          }
        }
        this.logger.warn(
          `Skipping Gmail message ${item.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return messages;
  }

  async sendMail(
    accessToken: string,
    input: SendMailboxMessageInput,
  ): Promise<SendMailboxMessageResult> {
    const raw = this.buildRawMime(input);
    const encoded = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      },
    );
    await assertMailboxOk(res, 'Gmail', 'send message');
    const json = (await res.json()) as { id?: string };
    return { providerMessageId: json.id ?? null };
  }

  private buildRawMime(input: SendMailboxMessageInput): string {
    const to = input.to.map(extractEmailAddress).join(', ');
    const cc = (input.cc ?? []).map(extractEmailAddress).join(', ');
    const boundary = `crm_outbound_${Date.now()}`;
    const hasAttachments = (input.attachments?.length ?? 0) > 0;

    const headers = [
      `From: ${input.fromAddress}`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${input.subject}`,
      'MIME-Version: 1.0',
      input.inReplyToMessageId
        ? `In-Reply-To: ${input.inReplyToMessageId}`
        : null,
      input.inReplyToMessageId
        ? `References: ${input.inReplyToMessageId}`
        : null,
    ].filter(Boolean) as string[];

    if (!hasAttachments) {
      return [
        ...headers,
        'Content-Type: text/html; charset="UTF-8"',
        '',
        input.bodyHtml,
      ].join('\r\n');
    }

    const parts: string[] = [
      ...headers,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      input.bodyHtml,
    ];

    for (const file of input.attachments ?? []) {
      parts.push(
        `--${boundary}`,
        `Content-Type: ${file.contentType}; name="${file.fileName}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${file.fileName}"`,
        '',
        file.contentBase64.replace(/(.{76})/g, '$1\r\n'),
      );
    }
    parts.push(`--${boundary}--`, '');
    return parts.join('\r\n');
  }
}
