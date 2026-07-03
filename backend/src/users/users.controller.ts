import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
