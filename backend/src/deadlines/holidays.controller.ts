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
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DEADLINES_MODULE } from './deadlines.constants';
import {
  CreateHolidayDto,
  ListHolidaysQueryDto,
  UpdateHolidayDto,
} from './dto/holiday.dto';
import { HolidaysService } from './holidays.service';

@Controller('holidays')
@RequirePermissions('deadline:read')
@Audit({
  action: 'holiday',
  resource: 'holiday',
  module: DEADLINES_MODULE,
})
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  list(@Query() query: ListHolidaysQueryDto) {
    return this.holidays.list(query);
  }

  @Get(':id')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  findOne(@Param('id') id: string) {
    return this.holidays.findById(id);
  }

  @Post()
  @RequirePermissions('deadline:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'holiday.create',
    resource: 'holiday',
    module: DEADLINES_MODULE,
  })
  create(@Body() dto: CreateHolidayDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.holidays.create(dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'holiday.update',
    resource: 'holiday',
    module: DEADLINES_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidays.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('deadline:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'holiday.delete',
    resource: 'holiday',
    module: DEADLINES_MODULE,
  })
  remove(@Param('id') id: string) {
    return this.holidays.remove(id);
  }
}
