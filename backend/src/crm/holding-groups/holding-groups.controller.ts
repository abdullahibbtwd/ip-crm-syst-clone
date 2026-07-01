import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CRM_MODULE } from '../crm.constants';
import {
  CreateHoldingGroupDto,
  HoldingGroupQueryDto,
  UpdateHoldingGroupDto,
} from './dto/holding-group.dto';
import { HoldingGroupsService } from './holding-groups.service';

@Controller('holding-groups')
@RequirePermissions('client:read')
@Audit({ action: 'holding-groups', resource: 'client', module: CRM_MODULE })
export class HoldingGroupsController {
  constructor(private readonly holdingGroupsService: HoldingGroupsService) {}

  @Post()
  @RequirePermissions('client:create')
  create(@Body() dto: CreateHoldingGroupDto) {
    return this.holdingGroupsService.create(dto);
  }

  @Get()
  findAll(@Query() query: HoldingGroupQueryDto) {
    return this.holdingGroupsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.holdingGroupsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('client:update')
  update(@Param('id') id: string, @Body() dto: UpdateHoldingGroupDto) {
    return this.holdingGroupsService.update(id, dto);
  }
}
