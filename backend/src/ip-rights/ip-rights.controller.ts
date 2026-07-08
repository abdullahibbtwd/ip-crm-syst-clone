import { Controller, Get, Req, Query } from '@nestjs/common'
import type { Request } from 'express'
import { Audit } from '../common/decorators/audit.decorator'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { IP_RIGHTS_MODULE } from './ip-rights.constants'
import { IpRightsService } from './ip-rights.service'
import { ListIpRightsQueryDto } from './dto/ip-rights-query.dto'

@Controller('ip-rights')
@RequirePermissions('matter:read')
@Audit({ action: 'ip_rights', resource: 'ip_right', module: IP_RIGHTS_MODULE })
export class IpRightsController {
  constructor(private readonly ipRights: IpRightsService) {}

  @Get()
  list(@Query() query: ListIpRightsQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser
    return this.ipRights.list(user, query)
  }
}

