import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthService } from '../auth/auth.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @RequirePermissions('user:read')
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('assignees')
  @RequirePermissions('intake:read')
  listAttorneyAssignees() {
    return this.usersService.listAttorneyAssignees();
  }

  @Get('team-members')
  @RequirePermissions('task:read')
  listTeamMembers() {
    return this.usersService.listTeamMembers();
  }

  @Get('deadline-assignees')
  @RequirePermissions('deadline:read')
  listDeadlineAssignees() {
    return this.usersService.listTeamMembers();
  }

  @Post('invite')
  @RequirePermissions('user:create')
  @Audit({ action: 'user.invite', resource: 'user', module: 'users' })
  invite(@Body() dto: InviteUserDto) {
    return this.usersService.invite(dto);
  }

  @Patch(':id/role')
  @RequirePermissions('user:update')
  @Audit({ action: 'user.role_update', resource: 'user', module: 'users' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.usersService.updateRole(id, dto, actor.userId);
  }

  @Post(':id/mfa/reset')
  @RequirePermissions('user:update')
  @Roles(SYSTEM_ROLES.IT_ADMIN, SYSTEM_ROLES.MANAGING_PARTNER)
  @Audit({ action: 'user.mfa_reset', resource: 'user', module: 'users' })
  resetMfa(@Param('id') id: string) {
    return this.authService.resetUserMfa(id);
  }
}
