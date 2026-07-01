import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, SkipAudit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import { HistoryService } from '../history/history.service';
import { ClientQueryDto, UpdateClientDto } from './dto/client.dto';
import { ClientsService } from './clients.service';

@Controller('clients')
@RequirePermissions('client:read')
@Audit({ action: 'clients', resource: 'client', module: CRM_MODULE })
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly historyService: HistoryService,
  ) {}

  @Get()
  findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Get(':id/summary')
  getSummary(@Param('id') id: string) {
    return this.clientsService.getSummary(id);
  }

  @Get(':id/history')
  @SkipAudit()
  getHistory(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.historyService.findByClient(id, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id')
  @RequirePermissions('client:update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.clientsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('client:delete')
  archive(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.clientsService.archive(id, user.userId);
  }
}
