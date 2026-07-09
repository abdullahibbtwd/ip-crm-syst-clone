import { BadRequestException, Injectable } from '@nestjs/common';
import type { AddressObject } from 'mailparser';
import { simpleParser } from 'mailparser';

export type ParsedEmailAttachment = {
  fileName: string;
  contentType: string;
  size: number;
};

export type ParsedEmailResult = {
  sender: string;
  recipient: string;
  cc: string[];
  subject: string;
  correspondenceDate: string;
  bodyText: string | null;
  bodyHtml: string | null;
  messageId: string | null;
  attachments: ParsedEmailAttachment[];
  headersDetected: boolean;
};

const HEADER_PATTERNS: Array<{ key: keyof HeaderFields; pattern: RegExp }> = [
  { key: 'from', pattern: /^From:\s*(.+)$/im },
  { key: 'to', pattern: /^To:\s*(.+)$/im },
  { key: 'cc', pattern: /^Cc:\s*(.+)$/im },
  { key: 'subject', pattern: /^Subject:\s*(.+)$/im },
  { key: 'date', pattern: /^Date:\s*(.+)$/im },
];

type HeaderFields = {
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
};

@Injectable()
export class EmlParserService {
  async parseBuffer(buffer: Buffer): Promise<ParsedEmailResult> {
    if (!buffer?.length) {
      throw new BadRequestException('Email file is empty');
    }

    const parsed = await simpleParser(buffer);
    return this.fromMailparser(parsed);
  }

  parsePastedText(text: string): ParsedEmailResult {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new BadRequestException('Pasted email text is empty');
    }

    const headers: Partial<HeaderFields> = {};
    const lines = trimmed.split(/\r?\n/);
    let headerEndIndex = 0;
    let inHeaders = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (inHeaders && line.trim() === '') {
        headerEndIndex = i + 1;
        break;
      }
      if (inHeaders && /^[\w-]+:\s*/.test(line)) {
        for (const { key, pattern } of HEADER_PATTERNS) {
          const match = line.match(pattern);
          if (match) headers[key] = match[1].trim();
        }
        headerEndIndex = i + 1;
      } else if (inHeaders && line.trim() && !/^[\w-]+:\s*/.test(line)) {
        inHeaders = false;
        headerEndIndex = i;
        break;
      }
    }

    const headersDetected = Boolean(
      headers.from || headers.to || headers.subject || headers.date,
    );

    const bodyText = (
      headersDetected ? lines.slice(headerEndIndex).join('\n') : trimmed
    ).trim();

    const cc = headers.cc
      ? headers.cc
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    return {
      sender: headers.from ?? '',
      recipient: headers.to ?? '',
      cc,
      subject: headers.subject ?? '',
      correspondenceDate: this.parseDateToIso(headers.date),
      bodyText: bodyText || null,
      bodyHtml: null,
      messageId: null,
      attachments: [],
      headersDetected,
    };
  }

  private fromMailparser(parsed: Awaited<ReturnType<typeof simpleParser>>): ParsedEmailResult {
    const cc = this.formatCc(parsed.cc);
    const attachments: ParsedEmailAttachment[] = (parsed.attachments ?? []).map(
      (att) => ({
        fileName: att.filename ?? 'attachment',
        contentType: att.contentType ?? 'application/octet-stream',
        size: att.size ?? att.content?.length ?? 0,
      }),
    );

    return {
      sender: this.formatAddress(parsed.from),
      recipient: this.formatAddress(parsed.to),
      cc,
      subject: parsed.subject?.trim() ?? '',
      correspondenceDate: this.parseDateToIso(
        parsed.date ? parsed.date.toISOString() : undefined,
      ),
      bodyText: parsed.text?.trim() || null,
      bodyHtml:
        typeof parsed.html === 'string' ? parsed.html.trim() || null : null,
      messageId: parsed.messageId?.replace(/^<|>$/g, '') ?? null,
      attachments,
      headersDetected: true,
    };
  }

  private formatAddress(
    field: AddressObject | AddressObject[] | undefined,
  ): string {
    if (!field) return '';
    const list = Array.isArray(field) ? field : [field];
    return list
      .map((entry) => entry.text?.trim())
      .filter(Boolean)
      .join(', ');
  }

  private formatCc(field: AddressObject | AddressObject[] | undefined): string[] {
    if (!field) return [];
    const list = Array.isArray(field) ? field : [field];
    return list
      .flatMap((entry) =>
        (entry.value ?? []).map((v) => v.address ?? v.name ?? '').filter(Boolean),
      )
      .filter(Boolean);
  }

  private parseDateToIso(raw?: string): string {
    if (!raw?.trim()) {
      return new Date().toISOString().slice(0, 10);
    }
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return parsed.toISOString().slice(0, 10);
  }
}
