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
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { CreateTaskDto, MyTasksQueryDto, UpdateTaskDto } from './dto/task.dto';
import { TASKS_MODULE } from './tasks.constants';
import { TasksService } from './tasks.service';

@Controller('matters/:matterId/tasks')
@RequirePermissions('task:read')
@Audit({ action: 'task', resource: 'task', module: TASKS_MODULE })
export class MatterTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  list(@Param('matterId') matterId: string) {
    return this.tasksService.listForMatter(matterId);
  }

  @Post()
  @RequirePermissions('task:create')
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tasksService.create(matterId, dto, user.userId);
  }
}

@Controller('tasks')
@RequirePermissions('task:read')
@Audit({ action: 'task', resource: 'task', module: TASKS_MODULE })
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('my')
  listMy(@Query() query: MyTasksQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.tasksService.listMyTasks(user.userId, query);
  }

  @Patch(':id')
  @RequirePermissions('task:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.tasksService.update(id, dto, user.userId, user.roles);
  }

  @Delete(':id')
  @RequirePermissions('task:delete')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER)
  remove(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}
