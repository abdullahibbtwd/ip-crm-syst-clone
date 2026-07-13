import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { PortalMessagesService } from './portal-messages.service';

@Controller('portal/messages')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@RequirePermissions('correspondence:read')
export class PortalMessagesController {
  constructor(
    private readonly messages: PortalMessagesService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.messages.listForClient(clientId);
  }

  @Get('unread-count')
  unreadCount(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.messages.countUnread(clientId).then((count) => ({ count }));
  }

  @Get('broadcast/:id')
  findBroadcast(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.messages.findOneForClient(clientId, `broadcast:${id}`);
  }

  @Get('correspondence/:id')
  findCorrespondence(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.messages.findOneForClient(clientId, `correspondence:${id}`);
  }
}
