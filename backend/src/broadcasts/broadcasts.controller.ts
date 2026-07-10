import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BROADCASTS_MODULE } from './broadcasts.constants';
import { BroadcastsService } from './broadcasts.service';
import {
  CreateBroadcastDto,
  PreviewBroadcastAudienceDto,
} from './dto/broadcast.dto';

@Controller('broadcasts')
@Audit({
  action: 'broadcast',
  resource: 'broadcast',
  module: BROADCASTS_MODULE,
})
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Get()
  @RequirePermissions('broadcast:read')
  list() {
    return this.broadcasts.listBroadcasts();
  }

  @Post('preview')
  @RequirePermissions('broadcast:read')
  preview(@Body() dto: PreviewBroadcastAudienceDto) {
    return this.broadcasts.previewAudience(dto.audience, dto.clientIds);
  }

  @Get(':id')
  @RequirePermissions('broadcast:read')
  get(@Param('id') id: string) {
    return this.broadcasts.getBroadcast(id);
  }

  @Post()
  @RequirePermissions('broadcast:create')
  @Audit({
    action: 'bulk_notification',
    resource: 'broadcast',
    module: BROADCASTS_MODULE,
  })
  create(@Body() dto: CreateBroadcastDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.broadcasts.createAndEnqueue(dto, user.userId);
  }
}
