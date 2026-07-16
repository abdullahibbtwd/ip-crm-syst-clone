import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { EmailIntegrationController } from './email-integration.controller';
import type { MailboxConnectionsService } from './mailbox-connections.service';
import type { MailboxOAuthService } from './mailbox-oauth.service';
import type { EmailSyncService } from './email-sync.service';
import type { OutboundEmailService } from './outbound-email.service';

describe('EmailIntegrationController', () => {
  const oauth = {
    getConfiguredProviders: jest.fn(),
    startConnect: jest.fn(),
    handleCallback: jest.fn(),
  };
  const connections = {
    listForUser: jest.fn(),
    revokeConnection: jest.fn(),
  };
  const sync = {
    syncConnection: jest.fn(),
    fetchForUser: jest.fn(),
  };
  const outbound = {
    buildDraftReply: jest.fn(),
    enqueueAndWait: jest.fn(),
  };

  const controller = new EmailIntegrationController(
    oauth as unknown as MailboxOAuthService,
    connections as unknown as MailboxConnectionsService,
    sync as unknown as EmailSyncService,
    outbound as unknown as OutboundEmailService,
  );

  const user = {
    userId: 'u1',
    roles: ['ip_attorney'],
  } as AuthenticatedUser;
  const req = { user } as Request;
  const res = {} as Response;

  beforeEach(() => jest.clearAllMocks());

  it('forwards provider and connection reads', () => {
    controller.getProviders();
    controller.listConnections(req);

    expect(oauth.getConfiguredProviders).toHaveBeenCalled();
    expect(connections.listForUser).toHaveBeenCalledWith('u1');
  });

  it('forwards OAuth connect and callback', () => {
    controller.connect('google', req, res);
    controller.callback('google', req, res);

    expect(oauth.startConnect).toHaveBeenCalledWith('google', 'u1', res);
    expect(oauth.handleCallback).toHaveBeenCalledWith('google', req, res);
  });

  it('forwards revoke and sync paths', async () => {
    connections.listForUser.mockResolvedValue([
      { id: 'c1', status: 'active' },
      { id: 'c2', status: 'revoked' },
    ]);
    sync.syncConnection.mockResolvedValue(2);
    sync.fetchForUser.mockResolvedValue({ ingested: 3, limit: 5 });

    await controller.revoke('c1', req);
    await expect(controller.syncNow(req)).resolves.toEqual({ ingested: 2 });
    await expect(controller.fetchNow(req)).resolves.toEqual({
      ingested: 3,
      limit: 5,
    });

    expect(connections.revokeConnection).toHaveBeenCalledWith('u1', 'c1');
    expect(sync.syncConnection).toHaveBeenCalledWith('c1');
    expect(sync.fetchForUser).toHaveBeenCalledWith('u1');
  });

  it('forwards outbound draft and send', async () => {
    const dto = { matterId: 'm1', connectionId: 'c1', to: ['a@b.com'], subject: 'Hi', bodyText: 'Body' };

    controller.draftReply('m1', 'ue1', 'corr1', 'true');
    await controller.sendOutbound(dto as never, req);

    expect(outbound.buildDraftReply).toHaveBeenCalledWith({
      matterId: 'm1',
      unlinkedEmailId: 'ue1',
      correspondenceId: 'corr1',
      useAi: true,
    });
    expect(outbound.enqueueAndWait).toHaveBeenCalledWith(
      dto,
      'u1',
      user.roles,
    );
  });
});
