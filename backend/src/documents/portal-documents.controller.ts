import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentsService } from './documents.service';
import { PortalDocumentQueryDto } from './dto/document.dto';

@Controller('portal/documents')
@RequirePermissions('document:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({ action: 'document', resource: 'document', module: DOCUMENTS_MODULE })
export class PortalDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Query() query: PortalDocumentQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.documentsService.listForPortalClient(clientId, query);
  }
}
