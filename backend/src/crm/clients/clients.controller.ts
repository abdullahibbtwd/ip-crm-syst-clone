import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, SkipAudit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { AuditService } from '../../audit/audit.service';
import { SYSTEM_ROLES } from '../../rbac/rbac.constants';
import { GdprExportService } from '../../compliance/gdpr-export.service';
import { CRM_MODULE } from '../crm.constants';
import { HistoryService } from '../history/history.service';
import { ClientQueryDto, UpdateClientDto } from './dto/client.dto';
import { ClientsService } from './clients.service';

@Controller('clients')
@RequirePermissions('client:read')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly historyService: HistoryService,
    private readonly auditService: AuditService,
    private readonly gdprExport: GdprExportService,
  ) {}

  @Get()
  @SkipAudit()
  findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  @Audit({ action: 'client.read', resource: 'client', module: CRM_MODULE })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/summary')
  @Audit({ action: 'client.read', resource: 'client', module: CRM_MODULE })
  getSummary(@Param('id') id: string) {
    return this.clientsService.getSummary(id);
  }

  @Get(':id/address-insights')
  @Audit({ action: 'client.read', resource: 'client', module: CRM_MODULE })
  getAddressInsights(@Param('id') id: string) {
    return this.clientsService.getAddressInsights(id);
  }

  @Get(':id/data-access')
  @Roles(SYSTEM_ROLES.DPO_COMPLIANCE, SYSTEM_ROLES.MANAGING_PARTNER)
  @RequirePermissions('audit:read')
  @Audit({ action: 'client.access_history', resource: 'client', module: CRM_MODULE })
  getDataAccess(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.queryDataAccess(id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post(':id/data-export')
  @Roles(SYSTEM_ROLES.DPO_COMPLIANCE, SYSTEM_ROLES.MANAGING_PARTNER)
  @RequirePermissions('audit:read')
  @Audit({
    action: 'personal_data_export',
    resource: 'client',
    module: CRM_MODULE,
    personalDataExport: true,
  })
  exportClientData(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.gdprExport.exportClientBundle(id, user);
  }

  @Get(':id/history')
  @SkipAudit()
  getHistory(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.findByClient(id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id')
  @RequirePermissions('client:update')
  @Audit({ action: 'client.update', resource: 'client', module: CRM_MODULE })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.clientsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('client:delete')
  @Audit({ action: 'client.archive', resource: 'client', module: CRM_MODULE })
  archive(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.clientsService.archive(id, user.userId);
  }
}
