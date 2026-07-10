import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MailboxConnectionStatus,
  MailboxProvider,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { MailboxProviderId } from './email-integration.constants';
import { MAILBOX_TOKEN_REFRESH_SKEW_MS } from './email-integration.constants';
import { MailboxAuthError } from './mailbox-http.errors';
import { MailboxTokenService } from './mailbox-token.service';

const connectionSelect = {
  id: true,
  userId: true,
  provider: true,
  emailAddress: true,
  status: true,
  accessTokenExpiresAt: true,
  lastSyncAt: true,
  lastSyncError: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.MailboxConnectionSelect;

@Injectable()
export class MailboxConnectionsService {
  private readonly logger = new Logger(MailboxConnectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: MailboxTokenService,
    private readonly config: ConfigService,
  ) {}

  listForUser(userId: string) {
    return this.prisma.mailboxConnection.findMany({
      where: { userId },
      orderBy: { provider: 'asc' },
      select: connectionSelect,
    });
  }

  async getForUser(userId: string, connectionId: string) {
    const row = await this.prisma.mailboxConnection.findFirst({
      where: { id: connectionId, userId },
      select: connectionSelect,
    });
    if (!row) throw new NotFoundException('Mailbox connection not found');
    return row;
  }

  async upsertConnection(input: {
    userId: string;
    provider: MailboxProviderId;
    emailAddress: string;
    refreshToken: string;
    accessToken?: string;
    accessTokenExpiresAt?: number;
  }) {
    const encryptedTokens = this.tokens.encrypt({
      refreshToken: input.refreshToken,
      accessToken: input.accessToken,
      accessTokenExpiresAt: input.accessTokenExpiresAt,
    });

    const accessTokenExpiresAt = input.accessTokenExpiresAt
      ? new Date(input.accessTokenExpiresAt)
      : null;

    return this.prisma.mailboxConnection.upsert({
      where: {
        userId_provider: {
          userId: input.userId,
          provider: input.provider as MailboxProvider,
        },
      },
      create: {
        userId: input.userId,
        provider: input.provider as MailboxProvider,
        emailAddress: input.emailAddress,
        encryptedTokens,
        accessTokenExpiresAt,
        status: MailboxConnectionStatus.active,
        lastSyncError: null,
      },
      update: {
        emailAddress: input.emailAddress,
        encryptedTokens,
        accessTokenExpiresAt,
        status: MailboxConnectionStatus.active,
        lastSyncError: null,
      },
      select: connectionSelect,
    });
  }

  async revokeConnection(userId: string, connectionId: string) {
    const row = await this.getForUser(userId, connectionId);
    return this.prisma.mailboxConnection.update({
      where: { id: row.id },
      data: { status: MailboxConnectionStatus.revoked },
      select: connectionSelect,
    });
  }

  async listActiveConnections() {
    return this.prisma.mailboxConnection.findMany({
      where: { status: MailboxConnectionStatus.active },
      select: {
        ...connectionSelect,
        encryptedTokens: true,
        syncCursor: true,
      },
    });
  }

  /** Active connections whose access token is missing or near expiry. */
  async listConnectionsNeedingTokenRefresh(skewMs = MAILBOX_TOKEN_REFRESH_SKEW_MS) {
    const threshold = new Date(Date.now() + skewMs);
    return this.prisma.mailboxConnection.findMany({
      where: {
        status: MailboxConnectionStatus.active,
        OR: [
          { accessTokenExpiresAt: null },
          { accessTokenExpiresAt: { lte: threshold } },
        ],
      },
      select: { id: true, provider: true, emailAddress: true },
    });
  }

  async getAccessToken(connectionId: string): Promise<string> {
    const row = await this.prisma.mailboxConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        provider: true,
        encryptedTokens: true,
        status: true,
      },
    });
    if (!row || row.status !== MailboxConnectionStatus.active) {
      throw new NotFoundException('Active mailbox connection not found');
    }

    const payload = this.tokens.decrypt(row.encryptedTokens);
    if (
      payload.accessToken &&
      payload.accessTokenExpiresAt &&
      payload.accessTokenExpiresAt > Date.now() + 60_000
    ) {
      return payload.accessToken;
    }

    const refreshed = await this.refreshAndPersist(
      connectionId,
      row.provider as MailboxProviderId,
      payload.refreshToken,
    );
    return refreshed.accessToken;
  }

  /**
   * Proactively refresh the access token (token-rotation janitor).
   * Returns true when a refresh was performed.
   */
  async ensureFreshAccessToken(connectionId: string): Promise<boolean> {
    const row = await this.prisma.mailboxConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        provider: true,
        encryptedTokens: true,
        status: true,
        accessTokenExpiresAt: true,
      },
    });
    if (!row || row.status !== MailboxConnectionStatus.active) {
      return false;
    }

    const stillFresh =
      row.accessTokenExpiresAt &&
      row.accessTokenExpiresAt.getTime() > Date.now() + MAILBOX_TOKEN_REFRESH_SKEW_MS;

    if (stillFresh) {
      const payload = this.tokens.decrypt(row.encryptedTokens);
      if (
        payload.accessToken &&
        payload.accessTokenExpiresAt &&
        payload.accessTokenExpiresAt > Date.now() + MAILBOX_TOKEN_REFRESH_SKEW_MS
      ) {
        return false;
      }
    }

    const payload = this.tokens.decrypt(row.encryptedTokens);
    await this.refreshAndPersist(
      connectionId,
      row.provider as MailboxProviderId,
      payload.refreshToken,
    );
    return true;
  }

  async refreshExpiringTokens(): Promise<{ checked: number; refreshed: number; failed: number }> {
    const due = await this.listConnectionsNeedingTokenRefresh();
    let refreshed = 0;
    let failed = 0;

    for (const connection of due) {
      try {
        const didRefresh = await this.ensureFreshAccessToken(connection.id);
        if (didRefresh) refreshed += 1;
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Token refresh failed for ${connection.id} (${connection.emailAddress}): ${message}`,
        );
        await this.markSyncError(connection.id, message);
      }
    }

    return { checked: due.length, refreshed, failed };
  }

  async markSyncSuccess(connectionId: string, syncCursor?: string) {
    await this.prisma.mailboxConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
        syncCursor: syncCursor ?? undefined,
        status: MailboxConnectionStatus.active,
      },
    });
  }

  async markSyncError(connectionId: string, message: string) {
    await this.prisma.mailboxConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncError: message.slice(0, 1000),
        status: MailboxConnectionStatus.error,
      },
    });
  }

  private async refreshAndPersist(
    connectionId: string,
    provider: MailboxProviderId,
    refreshToken: string,
  ): Promise<{ accessToken: string; accessTokenExpiresAt: number }> {
    try {
      const refreshed = await this.refreshAccessToken(provider, refreshToken);
      const encryptedTokens = this.tokens.encrypt({
        refreshToken: refreshed.refreshToken,
        accessToken: refreshed.accessToken,
        accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      });

      await this.prisma.mailboxConnection.update({
        where: { id: connectionId },
        data: {
          encryptedTokens,
          accessTokenExpiresAt: new Date(refreshed.accessTokenExpiresAt),
          status: MailboxConnectionStatus.active,
          lastSyncError: null,
        },
      });

      return refreshed;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new MailboxAuthError(provider, message);
    }
  }

  private async refreshAccessToken(
    provider: MailboxProviderId,
    refreshToken: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresAt: number;
  }> {
    if (provider === 'microsoft') {
      const tenant =
        this.config.get('MAILBOX_MICROSOFT_TENANT_ID') ??
        this.config.get('MICROSOFT_TENANT_ID', 'common');
      const clientId =
        this.config.get('MAILBOX_MICROSOFT_CLIENT_ID') ??
        this.config.getOrThrow('MICROSOFT_CLIENT_ID');
      const clientSecret =
        this.config.get('MAILBOX_MICROSOFT_CLIENT_SECRET') ??
        this.config.getOrThrow('MICROSOFT_CLIENT_SECRET');

      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.Send offline_access',
      });

      const res = await fetch(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        },
      );
      const json = (await res.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error_description?: string;
      };
      if (!res.ok || !json.access_token) {
        throw new Error(json.error_description ?? 'Microsoft token refresh failed');
      }
      return {
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? refreshToken,
        accessTokenExpiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
      };
    }

    const clientId =
      this.config.get('MAILBOX_GOOGLE_CLIENT_ID') ??
      this.config.getOrThrow('GOOGLE_CLIENT_ID');
    const clientSecret =
      this.config.get('MAILBOX_GOOGLE_CLIENT_SECRET') ??
      this.config.getOrThrow('GOOGLE_CLIENT_SECRET');

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(json.error_description ?? 'Google token refresh failed');
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? refreshToken,
      accessTokenExpiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    };
  }
}
