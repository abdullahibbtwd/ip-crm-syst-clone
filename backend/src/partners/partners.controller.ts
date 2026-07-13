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
import {
  CreatePartnerDto,
  ListPartnersQueryDto,
  UpdatePartnerDto,
} from './dto/partner.dto';
import { PARTNERS_MODULE } from './partners.constants';
import { PartnersService } from './partners.service';

const PARTNER_STAFF_ROLES = [
  SYSTEM_ROLES.MANAGING_PARTNER,
  SYSTEM_ROLES.IP_ATTORNEY,
  SYSTEM_ROLES.TRADEMARK_ATTORNEY,
  SYSTEM_ROLES.COORDINATOR,
  SYSTEM_ROLES.DOCKETING_ADMIN,
  SYSTEM_ROLES.PARALEGAL,
] as const;

@Controller('partners')
@RequirePermissions('partner:read')
@Roles(...PARTNER_STAFF_ROLES)
@Audit({
  action: 'partner',
  resource: 'partner',
  module: PARTNERS_MODULE,
})
export class PartnersController {
  constructor(private readonly partners: PartnersService) {}

  @Get()
  list(@Query() query: ListPartnersQueryDto) {
    return this.partners.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partners.findById(id);
  }

  @Post()
  @RequirePermissions('partner:create')
  @Audit({
    action: 'partner.create',
    resource: 'partner',
    module: PARTNERS_MODULE,
  })
  create(@Body() dto: CreatePartnerDto) {
    return this.partners.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('partner:update')
  @Audit({
    action: 'partner.update',
    resource: 'partner',
    module: PARTNERS_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.partners.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('partner:update')
  @Audit({
    action: 'partner.deactivate',
    resource: 'partner',
    module: PARTNERS_MODULE,
  })
  deactivate(@Param('id') id: string) {
    return this.partners.deactivate(id);
  }
}
