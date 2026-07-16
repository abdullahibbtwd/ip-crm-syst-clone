import { BadRequestException } from '@nestjs/common';
import { EmlParserService } from './eml-parser.service';

describe('EmlParserService', () => {
  const service = new EmlParserService();

  it('parsePastedText extracts headers', () => {
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

  it('parsePastedText rejects empty', () => {
    expect(() => service.parsePastedText('   ')).toThrow(BadRequestException);
  });

  it('parseBuffer rejects empty', async () => {
    await expect(service.parseBuffer(Buffer.alloc(0))).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
