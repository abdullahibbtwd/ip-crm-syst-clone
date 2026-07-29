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
import { DEADLINES_MODULE } from './deadlines.constants';
import {
  CreateJurisdictionDto,
  ListJurisdictionsQueryDto,
  UpdateJurisdictionDto,
} from './dto/jurisdiction.dto';
import { JurisdictionsService } from './jurisdictions.service';

@Controller('jurisdictions')
@RequirePermissions('deadline:read')
@Audit({
  action: 'jurisdiction',
  resource: 'jurisdiction',
  module: DEADLINES_MODULE,
})
export class JurisdictionsController {
  constructor(private readonly jurisdictions: JurisdictionsService) {}

  @Get()
  list(@Query() query: ListJurisdictionsQueryDto) {
    return this.jurisdictions.list(query);
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.jurisdictions.findByCode(code);
  }

  @Get(':id')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  findOne(@Param('id') id: string) {
    return this.jurisdictions.findById(id);
  }

  @Post()
  @RequirePermissions('deadline:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'jurisdiction.create',
    resource: 'jurisdiction',
    module: DEADLINES_MODULE,
  })
  create(@Body() dto: CreateJurisdictionDto) {
    return this.jurisdictions.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'jurisdiction.update',
    resource: 'jurisdiction',
    module: DEADLINES_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdateJurisdictionDto) {
    return this.jurisdictions.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'jurisdiction.deactivate',
    resource: 'jurisdiction',
    module: DEADLINES_MODULE,
  })
  deactivate(@Param('id') id: string) {
    return this.jurisdictions.deactivate(id);
  }
}
