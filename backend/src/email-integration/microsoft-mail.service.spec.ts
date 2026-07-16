import { MicrosoftMailService } from './microsoft-mail.service';
import { MailboxRateLimitError } from './mailbox-http.errors';

describe('MicrosoftMailService', () => {
  let service: MicrosoftMailService;
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new MicrosoftMailService();
  });

  it('fetchNewMessages returns graph messages with mime bodies', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          value: [
            {
              id: 'msg-1',
              subject: 'Office action',
              from: { emailAddress: { name: 'Examiner', address: 'ex@uspto.gov' } },
              toRecipients: [
                { emailAddress: { address: 'inbox@firm.com' } },
              ],
              receivedDateTime: '2026-01-02T10:00:00Z',
              internetMessageId: '<internet-1>',
              hasAttachments: true,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Buffer.from('MIME body'),
      });

    const messages = await service.fetchNewMessages('token', {
      since: new Date('2026-01-01'),
      limit: 10,
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      externalMessageId: 'msg-1',
      internetMessageId: '<internet-1>',
      sender: 'Examiner <ex@uspto.gov>',
      recipient: 'inbox@firm.com',
      subject: 'Office action',
      hasAttachments: true,
    });
  });

  it('fetchNewMessages uses inbox endpoint when latestOnly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ value: [] }),
    });

    await service.fetchNewMessages('token', { latestOnly: true, limit: 5 });

    expect(fetchMock.mock.calls[0][0]).toContain('/mailFolders/inbox/messages');
  });

  it('fetchNewMessages skips messages when mime fetch fails', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: 'msg-1' }] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(service.fetchNewMessages('token')).resolves.toEqual([]);
  });

  it('fetchNewMessages propagates rate-limit errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'slow down',
      headers: { get: () => '2' },
    });

    await expect(service.fetchNewMessages('token')).rejects.toBeInstanceOf(
      MailboxRateLimitError,
    );
  });

  it('sendMail posts graph payload and returns null provider id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await service.sendMail('token', {
      fromAddress: 'me@firm.com',
      to: ['Client <client@example.com>'],
      cc: ['cc@example.com'],
      subject: 'Reply',
      bodyHtml: '<p>Hi</p>',
      inReplyToMessageId: '<parent>',
      attachments: [
        {
          fileName: 'doc.pdf',
          contentType: 'application/pdf',
          contentBase64: 'abc',
        },
      ],
    });

    expect(result).toEqual({ providerMessageId: null });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"contentType":"HTML"'),
      }),
    );
  });
});
