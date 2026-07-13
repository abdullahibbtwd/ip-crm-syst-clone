import { Controller, Get } from '@nestjs/common'
import { RequirePermissions } from '../common/decorators/permissions.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { SYSTEM_ROLES } from './rbac.constants'
import { RolesService } from './roles.service'

@Controller('roles')
@Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.IT_ADMIN)
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions('role:read')
  list() {
    return this.roles.listMatrix()
  }
}
