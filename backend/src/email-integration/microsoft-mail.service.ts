import { Injectable, Logger } from '@nestjs/common';

export type FetchedMailboxMessage = {
  externalMessageId: string;
  internetMessageId: string | null;
  rawMime: Buffer;
  sender: string;
  recipient: string;
  subject: string;
  receivedAt: Date;
  hasAttachments: boolean;
};

export type FetchMailboxMessagesOptions = {
  since?: Date;
  limit?: number;
  /** Latest inbox messages only (ignores since — used for manual fetch). */
  latestOnly?: boolean;
};

@Injectable()
export class MicrosoftMailService {
  private readonly logger = new Logger(MicrosoftMailService.name);

  async fetchNewMessages(
    accessToken: string,
    options: FetchMailboxMessagesOptions = {},
  ): Promise<FetchedMailboxMessage[]> {
    const limit = options.limit ?? 25;
    let listUrl: string;

    if (options.latestOnly) {
      listUrl =
        'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages' +
        '?$orderby=receivedDateTime desc' +
        `&$top=${limit}` +
        '&$select=id,subject,from,toRecipients,receivedDateTime,internetMessageId,hasAttachments';
    } else {
      const sinceIso =
        options.since?.toISOString() ??
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const filter = encodeURIComponent(`receivedDateTime ge ${sinceIso}`);
      listUrl =
        `https://graph.microsoft.com/v1.0/me/messages?$filter=${filter}` +
        '&$orderby=receivedDateTime desc' +
        `&$top=${limit}` +
        '&$select=id,subject,from,toRecipients,receivedDateTime,internetMessageId,hasAttachments';
    }

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Microsoft Graph list failed: ${err}`);
    }

    const listJson = (await listRes.json()) as {
      value?: Array<{
        id: string;
        subject?: string;
        from?: { emailAddress?: { address?: string; name?: string } };
        toRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
        receivedDateTime?: string;
        internetMessageId?: string;
        hasAttachments?: boolean;
      }>;
    };

    const messages: FetchedMailboxMessage[] = [];
    for (const item of listJson.value ?? []) {
      try {
        const mimeRes = await fetch(
          `https://graph.microsoft.com/v1.0/me/messages/${item.id}/$value`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!mimeRes.ok) continue;
        const rawMime = Buffer.from(await mimeRes.arrayBuffer());
        const sender = this.formatGraphAddress(item.from?.emailAddress);
        const recipient = (item.toRecipients ?? [])
          .map((r) => this.formatGraphAddress(r.emailAddress))
          .filter(Boolean)
          .join(', ');

        messages.push({
          externalMessageId: item.id,
          internetMessageId: item.internetMessageId ?? null,
          rawMime,
          sender: sender || 'Unknown sender',
          recipient: recipient || 'Unknown recipient',
          subject: item.subject?.trim() || '(No subject)',
          receivedAt: item.receivedDateTime
            ? new Date(item.receivedDateTime)
            : new Date(),
          hasAttachments: Boolean(item.hasAttachments),
        });
      } catch (err) {
        this.logger.warn(
          `Skipping Microsoft message ${item.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return messages;
  }

  private formatGraphAddress(
    entry?: { address?: string; name?: string },
  ): string {
    if (!entry) return '';
    if (entry.address && entry.name) return `${entry.name} <${entry.address}>`;
    return entry.address ?? entry.name ?? '';
  }
}
