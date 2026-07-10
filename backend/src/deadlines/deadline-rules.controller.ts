import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DeadlineRulesService } from './deadline-rules.service';
import { DEADLINES_MODULE } from './deadlines.constants';
import {
  CreateDeadlineRuleDto,
  ListDeadlineRulesQueryDto,
  UpdateDeadlineRuleDto,
} from './dto/deadline-rule.dto';

@Controller('deadline-rules')
@RequirePermissions('deadline:read')
@Audit({
  action: 'deadline_rule',
  resource: 'deadline_rule',
  module: DEADLINES_MODULE,
})
export class DeadlineRulesController {
  constructor(private readonly rules: DeadlineRulesService) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  list(@Query() query: ListDeadlineRulesQueryDto) {
    return this.rules.list(query);
  }

  @Get(':id')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  findOne(@Param('id') id: string) {
    return this.rules.findById(id);
  }

  @Post()
  @RequirePermissions('deadline:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'deadline_rule.create',
    resource: 'deadline_rule',
    module: DEADLINES_MODULE,
  })
  create(@Body() dto: CreateDeadlineRuleDto) {
    return this.rules.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'deadline_rule.update',
    resource: 'deadline_rule',
    module: DEADLINES_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdateDeadlineRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'deadline_rule.deactivate',
    resource: 'deadline_rule',
    module: DEADLINES_MODULE,
  })
  deactivate(@Param('id') id: string) {
    return this.rules.deactivate(id);
  }
}
