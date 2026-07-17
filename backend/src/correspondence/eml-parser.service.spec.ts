import { BadRequestException } from '@nestjs/common';
import { simpleParser } from 'mailparser';
import { EmlParserService } from './eml-parser.service';

jest.mock('mailparser', () => ({
  simpleParser: jest.fn(),
}));

describe('EmlParserService', () => {
  const service = new EmlParserService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parsePastedText', () => {
    it('extracts headers and body', () => {
      const result = service.parsePastedText(
        [
          'From: Ada <ada@example.com>',
          'To: Bill <bill@example.com>',
          'Subject: Hello',
          'Date: Thu, 15 Jan 2026 10:00:00 +0000',
          '',
          'Body line',
        ].join('\n'),
      );

      expect(result.sender).toContain('ada@example.com');
      expect(result.recipient).toContain('bill@example.com');
      expect(result.subject).toBe('Hello');
      expect(result.bodyText).toContain('Body line');
      expect(result.headersDetected).toBe(true);
    });

    it('parses CC recipients', () => {
      const result = service.parsePastedText(
        [
          'From: Ada <ada@example.com>',
          'To: Bill <bill@example.com>',
          'Cc: Carol <carol@example.com>, Dave <dave@example.com>',
          'Subject: Hello',
          '',
          'Body',
        ].join('\n'),
      );

      expect(result.cc).toEqual([
        'Carol <carol@example.com>',
        'Dave <dave@example.com>',
      ]);
    });

    it('treats plain text without headers as body-only', () => {
      const result = service.parsePastedText('Just pasted body text');

      expect(result.headersDetected).toBe(false);
      expect(result.bodyText).toBe('Just pasted body text');
      expect(result.sender).toBe('');
    });

    it('rejects empty pasted text', () => {
      expect(() => service.parsePastedText('   ')).toThrow(BadRequestException);
    });

    it('falls back to today for invalid dates', () => {
      const result = service.parsePastedText(
        ['From: a@x.com', 'Subject: x', 'Date: not-a-date', '', 'Body'].join('\n'),
      );

      expect(result.correspondenceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseBuffer', () => {
    it('rejects empty buffers', async () => {
      await expect(service.parseBuffer(Buffer.alloc(0))).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('maps mailparser output into ParsedEmailResult', async () => {
      (simpleParser as jest.Mock).mockResolvedValue({
        from: { text: 'Ada <ada@example.com>' },
        to: { text: 'Bill <bill@example.com>' },
        cc: [{ value: [{ address: 'carol@example.com' }] }],
        subject: '  Subject line  ',
        date: new Date('2026-01-15T10:00:00.000Z'),
        text: ' Plain text body ',
        html: '<p>HTML body</p>',
        messageId: '<msg-123@example.com>',
        attachments: [
          {
            filename: 'file.pdf',
            contentType: 'application/pdf',
            size: 42,
            content: Buffer.from('pdf'),
          },
          {
            contentType: 'application/octet-stream',
            content: Buffer.from('x'),
          },
        ],
      });

      const result = await service.parseBuffer(Buffer.from('raw eml'));

      expect(simpleParser).toHaveBeenCalled();
      expect(result.sender).toContain('ada@example.com');
      expect(result.recipient).toContain('bill@example.com');
      expect(result.cc).toEqual(['carol@example.com']);
      expect(result.subject).toBe('Subject line');
      expect(result.correspondenceDate).toBe('2026-01-15');
      expect(result.bodyText).toBe('Plain text body');
      expect(result.bodyHtml).toBe('<p>HTML body</p>');
      expect(result.messageId).toBe('msg-123@example.com');
      expect(result.headersDetected).toBe(true);
      expect(result.attachments).toEqual([
        {
          fileName: 'file.pdf',
          contentType: 'application/pdf',
          size: 42,
        },
        {
          fileName: 'attachment',
          contentType: 'application/octet-stream',
          size: 1,
        },
      ]);
    });

    it('handles sparse mailparser fields', async () => {
      (simpleParser as jest.Mock).mockResolvedValue({
        subject: undefined,
        text: undefined,
        html: undefined,
        attachments: undefined,
      });

      const result = await service.parseBuffer(Buffer.from('minimal'));

      expect(result.subject).toBe('');
      expect(result.bodyText).toBeNull();
      expect(result.bodyHtml).toBeNull();
      expect(result.attachments).toEqual([]);
      expect(result.messageId).toBeNull();
    });
  });
});
