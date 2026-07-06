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
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DEADLINES_MODULE } from './deadlines.constants';
import { DeadlinesService } from './deadlines.service';
import {
  CreateDeadlineDto,
  ListAllDeadlinesQueryDto,
  MyDeadlinesQueryDto,
  UpdateDeadlineStatusDto,
} from './dto/deadline.dto';

@Controller('deadlines')
@RequirePermissions('deadline:read')
@Audit({ action: 'deadline', resource: 'deadline', module: DEADLINES_MODULE })
export class DeadlinesController {
  constructor(private readonly deadlinesService: DeadlinesService) {}

  @Get()
  listAll(@Query() query: ListAllDeadlinesQueryDto) {
    return this.deadlinesService.listAllDeadlines(query);
  }

  @Get('my/today-count')
  countMyDueToday(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.deadlinesService.countDueTodayForUser(user);
  }

  @Get('today-count')
  countAllDueToday() {
    return this.deadlinesService.countDueToday();
  }

  @Get('my')
  listMy(@Query() query: MyDeadlinesQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.deadlinesService.listMyDeadlines(user, query);
  }

  @Post()
  @RequirePermissions('deadline:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  create(@Body() dto: CreateDeadlineDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.deadlinesService.createManual(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('deadline:update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDeadlineStatusDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.deadlinesService.updateStatus(id, dto.status, user.userId);
  }
}
