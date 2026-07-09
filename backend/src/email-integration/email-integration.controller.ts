import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { EMAIL_INTEGRATION_MODULE } from './email-integration.constants';
import { MailboxConnectionsService } from './mailbox-connections.service';
import { MailboxOAuthService } from './mailbox-oauth.service';
import { EmailSyncService } from './email-sync.service';

@Controller('email-integration')
@Audit({
  action: 'email_integration',
  resource: 'email',
  module: EMAIL_INTEGRATION_MODULE,
})
export class EmailIntegrationController {
  constructor(
    private readonly oauth: MailboxOAuthService,
    private readonly connections: MailboxConnectionsService,
    private readonly sync: EmailSyncService,
  ) {}

  @Get('providers')
  @RequirePermissions('email:read')
  getProviders() {
    return this.oauth.getConfiguredProviders();
  }

  @Get('connections')
  @RequirePermissions('email:read')
  listConnections(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.connections.listForUser(user.userId);
  }

  @Get('connect/:provider')
  @RequirePermissions('email:create')
  connect(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.oauth.startConnect(provider, user.userId, res);
  }

  @Public()
  @Get('callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.oauth.handleCallback(provider, req, res);
  }

  @Delete('connections/:id')
  @RequirePermissions('email:delete')
  revoke(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.connections.revokeConnection(user.userId, id);
  }

  @Post('sync-now')
  @RequirePermissions('email:create')
  async syncNow(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const connections = await this.connections.listForUser(user.userId);
    let ingested = 0;
    for (const connection of connections) {
      if (connection.status === 'active') {
        ingested += await this.sync.syncConnection(connection.id);
      }
    }
    return { ingested };
  }

  @Post('fetch')
  @RequirePermissions('email:create')
  async fetchNow(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.sync.fetchForUser(user.userId);
  }
}
