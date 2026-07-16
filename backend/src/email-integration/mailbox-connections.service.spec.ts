import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailboxConnectionStatus } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MAILBOX_TOKEN_REFRESH_SKEW_MS } from './email-integration.constants';
import { MailboxAuthError } from './mailbox-http.errors';
import { MailboxConnectionsService } from './mailbox-connections.service';
import { MailboxTokenService } from './mailbox-token.service';

describe('MailboxConnectionsService', () => {
  let service: MailboxConnectionsService;
  let prisma: Record<string, jest.Mock>;
  let tokens: { encrypt: jest.Mock; decrypt: jest.Mock };
  let config: { get: jest.Mock; getOrThrow: jest.Mock };
  const fetchMock = jest.fn();

  const connectionRow = {
    id: 'conn-1',
    userId: 'u1',
    provider: 'google',
    emailAddress: 'user@firm.com',
    status: MailboxConnectionStatus.active,
    accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    lastSyncAt: null,
    lastSyncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;

    prisma = {
      mailboxConnection: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    tokens = {
      encrypt: jest.fn((payload) => `enc:${JSON.stringify(payload)}`),
      decrypt: jest.fn((blob: string) => JSON.parse(blob.slice(4))),
    };
    config = {
      get: jest.fn((key: string, fallback?: string) => {
        const map: Record<string, string> = {
          GOOGLE_CLIENT_ID: 'google-id',
          GOOGLE_CLIENT_SECRET: 'google-secret',
          MICROSOFT_CLIENT_ID: 'ms-id',
          MICROSOFT_CLIENT_SECRET: 'ms-secret',
          MICROSOFT_TENANT_ID: 'common',
        };
        return map[key] ?? fallback;
      }),
      getOrThrow: jest.fn((key: string) => {
        const value = config.get(key);
        if (!value) throw new Error(`Missing ${key}`);
        return value;
      }),
    };

    service = new MailboxConnectionsService(
      prisma as unknown as PrismaService,
      tokens as unknown as MailboxTokenService,
      config as unknown as ConfigService,
    );
  });

  it('lists connections for a user', async () => {
    prisma.mailboxConnection.findMany.mockResolvedValue([connectionRow]);
    await expect(service.listForUser('u1')).resolves.toEqual([connectionRow]);
    expect(prisma.mailboxConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('getForUser throws when missing', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue(null);
    await expect(service.getForUser('u1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('upsertConnection encrypts tokens and sets active status', async () => {
    prisma.mailboxConnection.upsert.mockResolvedValue(connectionRow);
    const expiresAt = Date.now() + 3600_000;

    await service.upsertConnection({
      userId: 'u1',
      provider: 'google',
      emailAddress: 'user@firm.com',
      refreshToken: 'refresh',
      accessToken: 'access',
      accessTokenExpiresAt: expiresAt,
    });

    expect(tokens.encrypt).toHaveBeenCalledWith({
      refreshToken: 'refresh',
      accessToken: 'access',
      accessTokenExpiresAt: expiresAt,
    });
    expect(prisma.mailboxConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          status: MailboxConnectionStatus.active,
        }),
      }),
    );
  });

  it('revokeConnection marks connection revoked', async () => {
    prisma.mailboxConnection.findFirst.mockResolvedValue(connectionRow);
    prisma.mailboxConnection.update.mockResolvedValue({
      ...connectionRow,
      status: MailboxConnectionStatus.revoked,
    });

    const result = await service.revokeConnection('u1', 'conn-1');
    expect(result.status).toBe(MailboxConnectionStatus.revoked);
  });

  it('getAccessToken returns cached token when still valid', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      provider: 'google',
      status: MailboxConnectionStatus.active,
      encryptedTokens: 'enc:{}',
    });
    tokens.decrypt.mockReturnValue({
      refreshToken: 'refresh',
      accessToken: 'cached-token',
      accessTokenExpiresAt: Date.now() + 10 * 60 * 1000,
    });

    await expect(service.getAccessToken('conn-1')).resolves.toBe('cached-token');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getAccessToken refreshes expired google tokens via fetch', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      provider: 'google',
      status: MailboxConnectionStatus.active,
      encryptedTokens: 'enc:{}',
    });
    tokens.decrypt.mockReturnValue({
      refreshToken: 'refresh',
      accessToken: 'stale',
      accessTokenExpiresAt: Date.now() - 1000,
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: 3600,
      }),
    });
    prisma.mailboxConnection.update.mockResolvedValue({});

    await expect(service.getAccessToken('conn-1')).resolves.toBe('new-access');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(prisma.mailboxConnection.update).toHaveBeenCalled();
  });

  it('ensureFreshAccessToken returns false when token is still fresh', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      provider: 'google',
      status: MailboxConnectionStatus.active,
      encryptedTokens: 'enc:{}',
      accessTokenExpiresAt: new Date(Date.now() + MAILBOX_TOKEN_REFRESH_SKEW_MS + 60_000),
    });
    tokens.decrypt.mockReturnValue({
      refreshToken: 'refresh',
      accessToken: 'fresh',
      accessTokenExpiresAt: Date.now() + MAILBOX_TOKEN_REFRESH_SKEW_MS + 60_000,
    });

    await expect(service.ensureFreshAccessToken('conn-1')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshExpiringTokens counts refreshed and failed connections', async () => {
    prisma.mailboxConnection.findMany.mockResolvedValue([
      { id: 'c1', provider: 'google', emailAddress: 'a@x.com' },
      { id: 'c2', provider: 'microsoft', emailAddress: 'b@x.com' },
    ]);

    const ensureSpy = jest
      .spyOn(service, 'ensureFreshAccessToken')
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error('refresh failed'));
    const markErrorSpy = jest
      .spyOn(service, 'markSyncError')
      .mockResolvedValue(undefined);

    await expect(service.refreshExpiringTokens()).resolves.toEqual({
      checked: 2,
      refreshed: 1,
      failed: 1,
    });

    expect(markErrorSpy).toHaveBeenCalledWith('c2', 'refresh failed');
    ensureSpy.mockRestore();
    markErrorSpy.mockRestore();
  });

  it('markSyncError stores truncated message and error status', async () => {
    prisma.mailboxConnection.update.mockResolvedValue({});
    await service.markSyncError('conn-1', 'x'.repeat(2000));
    expect(prisma.mailboxConnection.update).toHaveBeenCalledWith({
      where: { id: 'conn-1' },
      data: {
        lastSyncError: 'x'.repeat(1000),
        status: MailboxConnectionStatus.error,
      },
    });
  });

  it('wraps fetch failures as MailboxAuthError', async () => {
    prisma.mailboxConnection.findUnique.mockResolvedValue({
      id: 'conn-1',
      provider: 'microsoft',
      status: MailboxConnectionStatus.active,
      encryptedTokens: 'enc:{}',
    });
    tokens.decrypt.mockReturnValue({
      refreshToken: 'refresh',
      accessToken: null,
      accessTokenExpiresAt: null,
    });
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error_description: 'invalid_grant' }),
    });

    await expect(service.getAccessToken('conn-1')).rejects.toBeInstanceOf(
      MailboxAuthError,
    );
  });
});
