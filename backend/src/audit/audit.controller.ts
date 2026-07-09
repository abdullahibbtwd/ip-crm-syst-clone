import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit, SkipAudit } from '../common/decorators/audit.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('audit')
@Roles(SYSTEM_ROLES.DPO_COMPLIANCE, SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
@RequirePermissions('audit:read')
@Audit({ action: 'audit.query', resource: 'audit', module: 'audit' })
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @SkipAudit()
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.query({
      userId: query.userId,
      resource: query.resource,
      module: query.module,
      action: query.action,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}

@Controller('compliance')
@Roles(SYSTEM_ROLES.DPO_COMPLIANCE, SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
@RequirePermissions('audit:read')
export class ComplianceController {
  constructor(private readonly auditService: AuditService) {}

  @Get('data-exports')
  @Audit({ action: 'compliance.exports', resource: 'audit', module: 'compliance' })
  listDataExports(
    @Query('clientId') clientId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.queryPersonalDataExports({
      clientId,
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
