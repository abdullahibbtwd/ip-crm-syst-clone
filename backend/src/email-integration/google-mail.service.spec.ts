import { GoogleMailService } from './google-mail.service';
import { MailboxAuthError } from './mailbox-http.errors';

describe('GoogleMailService', () => {
  let service: GoogleMailService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new GoogleMailService();
  });

  it('fetchNewMessages returns parsed gmail messages', async () => {
    const rawMime = Buffer.from('From: a@x.com\r\nSubject: Hi\r\n\r\nBody').toString(
      'base64',
    );

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-1',
          internalDate: String(Date.parse('2026-01-02T10:00:00Z')),
          payload: {
            headers: [
              { name: 'From', value: 'Sender <sender@example.com>' },
              { name: 'To', value: 'inbox@firm.com' },
              { name: 'Subject', value: 'Hello' },
              { name: 'Message-ID', value: '<internet-1>' },
            ],
          },
          raw: rawMime.replace(/\+/g, '-').replace(/\//g, '_'),
        }),
      });

    const messages = await service.fetchNewMessages('token', {
      since: new Date('2026-01-01'),
      limit: 5,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      externalMessageId: 'msg-1',
      internetMessageId: '<internet-1>',
      sender: 'Sender <sender@example.com>',
      recipient: 'inbox@firm.com',
      subject: 'Hello',
      hasAttachments: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('gmail.googleapis.com/gmail/v1/users/me/messages'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
      }),
    );
  });

  it('fetchNewMessages uses inbox label when latestOnly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });

    await service.fetchNewMessages('token', { latestOnly: true, limit: 3 });

    expect(String(fetchMock.mock.calls[0][0])).toContain('labelIds=INBOX');
  });

  it('fetchNewMessages skips non-ok detail responses', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(service.fetchNewMessages('token')).resolves.toEqual([]);
  });

  it('fetchNewMessages propagates auth errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'revoked',
      headers: { get: () => null },
    });

    await expect(service.fetchNewMessages('token')).rejects.toBeInstanceOf(
      MailboxAuthError,
    );
  });

  it('sendMail posts encoded raw mime and returns provider id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sent-1' }),
    });

    const result = await service.sendMail('token', {
      fromAddress: 'me@firm.com',
      to: ['client@example.com'],
      subject: 'Reply',
      bodyHtml: '<p>Hi</p>',
    });

    expect(result).toEqual({ providerMessageId: 'sent-1' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
        }),
      }),
    );
  });

  it('fetchNewMessages returns empty list when no messages', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    await expect(service.fetchNewMessages('token')).resolves.toEqual([]);
  });

  it('fetchNewMessages skips messages missing raw payload', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-1',
          payload: { headers: [] },
        }),
      });
    await expect(service.fetchNewMessages('token')).resolves.toEqual([]);
  });

  it('fetchNewMessages detects attachments in raw mime', async () => {
    const rawMime = Buffer.from(
      'From: a@x.com\r\nContent-Disposition: attachment\r\n\r\nBody',
    ).toString('base64');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-1',
          raw: rawMime.replace(/\+/g, '-').replace(/\//g, '_'),
          payload: { headers: [{ name: 'Subject', value: 'File' }] },
        }),
      });

    const messages = await service.fetchNewMessages('token', { limit: 1 });
    expect(messages[0].hasAttachments).toBe(true);
  });

  it('sendMail builds multipart mime with cc and attachments', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sent-2' }),
    });

    await service.sendMail('token', {
      fromAddress: 'me@firm.com',
      to: ['client@example.com'],
      cc: ['cc@example.com'],
      subject: 'Docs',
      bodyHtml: '<p>See attached</p>',
      inReplyToMessageId: '<parent>',
      attachments: [
        {
          fileName: 'doc.pdf',
          contentType: 'application/pdf',
          contentBase64: 'abc123',
        },
      ],
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.raw).toBeTruthy();
  });

  it('sendMail propagates provider errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'denied',
      headers: { get: () => null },
    });
    await expect(
      service.sendMail('token', {
        fromAddress: 'me@firm.com',
        to: ['client@example.com'],
        subject: 'Hi',
        bodyHtml: '<p>Hi</p>',
      }),
    ).rejects.toThrow();
  });

  it('sendMail without attachments uses simple html mime', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'sent-plain' }),
    });

    await service.sendMail('token', {
      fromAddress: 'me@firm.com',
      to: ['client@example.com'],
      subject: 'Plain',
      bodyHtml: '<p>Simple</p>',
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const decoded = Buffer.from(
      body.raw.replace(/-/g, '+').replace(/_/g, '/'),
      'base64',
    ).toString('utf8');
    expect(decoded).toContain('Content-Type: text/html');
    expect(decoded).not.toContain('multipart/mixed');
  });

  it('fetchNewMessages uses default since window when not provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: [] }),
    });
    await service.fetchNewMessages('token');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toMatch(/[?&]q=after(%3A|:)\d+/);
  });

  it('fetchNewMessages skips individual message on parse errors', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'bad' }] }),
      })
      .mockRejectedValueOnce(new Error('parse fail'));

    await expect(service.fetchNewMessages('token')).resolves.toEqual([]);
  });

  it('fetchNewMessages uses unknown recipient fallback from headers', async () => {
    const rawMime = Buffer.from('From: a@x.com\r\n\r\nBody').toString('base64');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [{ id: 'msg-2' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'msg-2',
          raw: rawMime.replace(/\+/g, '-').replace(/\//g, '_'),
          payload: { headers: [{ name: 'From', value: 'a@x.com' }] },
        }),
      });

    const messages = await service.fetchNewMessages('token', { limit: 1 });
    expect(messages[0].recipient).toBe('Unknown recipient');
    expect(messages[0].subject).toBe('(No subject)');
  });
});
