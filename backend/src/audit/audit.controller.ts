import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

@Controller('audit')
@Roles(SYSTEM_ROLES.DPO_COMPLIANCE, SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
@RequirePermissions('audit:read')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  findAll(@Query() query: AuditQueryDto) {
    return this.auditService.query({
      userId: query.userId,
      resource: query.resource,
      module: query.module,
      from: query.from,
      to: query.to,
      cursor: query.cursor,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
