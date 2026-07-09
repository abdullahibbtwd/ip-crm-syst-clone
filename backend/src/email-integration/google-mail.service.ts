import { Injectable, Logger } from '@nestjs/common';
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
    if (!listRes.ok) {
      const err = await listRes.text();
      throw new Error(`Gmail list failed: ${err}`);
    }

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
        this.logger.warn(
          `Skipping Gmail message ${item.id}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return messages;
  }
}
