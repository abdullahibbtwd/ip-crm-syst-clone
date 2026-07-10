import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { RETENTION_MODULE } from './retention.constants';
import { RetentionRulesService } from './retention-rules.service';
import {
  CreateRetentionRuleDto,
  UpdateRetentionRuleDto,
} from './dto/retention-rule.dto';

@Controller('retention-rules')
@Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DPO_COMPLIANCE)
@Audit({
  action: 'retention_rule',
  resource: 'retention_rule',
  module: RETENTION_MODULE,
})
export class RetentionRulesController {
  constructor(private readonly rules: RetentionRulesService) {}

  @Get()
  list() {
    return this.rules.list();
  }

  @Get(':id/dry-run')
  dryRun(@Param('id') id: string) {
    return this.rules.dryRun(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rules.findById(id);
  }

  @Post()
  @Audit({
    action: 'retention_rule.create',
    resource: 'retention_rule',
    module: RETENTION_MODULE,
  })
  create(@Body() dto: CreateRetentionRuleDto) {
    return this.rules.create(dto);
  }

  @Patch(':id')
  @Audit({
    action: 'retention_rule.update',
    resource: 'retention_rule',
    module: RETENTION_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdateRetentionRuleDto) {
    return this.rules.update(id, dto);
  }

  @Delete(':id')
  @Audit({
    action: 'retention_rule.deactivate',
    resource: 'retention_rule',
    module: RETENTION_MODULE,
  })
  deactivate(@Param('id') id: string) {
    return this.rules.deactivate(id);
  }
}
