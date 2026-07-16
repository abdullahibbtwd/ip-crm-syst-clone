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
});
