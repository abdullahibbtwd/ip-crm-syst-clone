import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit, SkipAudit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import { CreateClientNoteDto, UpdateClientNoteDto } from './dto/client-note.dto';
import { ClientNotesService } from './client-notes.service';

@Controller('clients/:clientId/notes')
@RequirePermissions('client:read')
export class ClientNotesController {
  constructor(private readonly notesService: ClientNotesService) {}

  @Get()
  @SkipAudit()
  findAll(@Param('clientId') clientId: string) {
    return this.notesService.findAll(clientId);
  }

  @Post()
  @RequirePermissions('client:update')
  @Audit({ action: 'client.note.create', resource: 'client', module: CRM_MODULE })
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientNoteDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.notesService.create(clientId, dto, user.userId);
  }

  @Patch(':noteId')
  @RequirePermissions('client:update')
  @Audit({ action: 'client.note.update', resource: 'client', module: CRM_MODULE })
  update(
    @Param('clientId') clientId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateClientNoteDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.notesService.update(clientId, noteId, dto, user.userId);
  }

  @Delete(':noteId')
  @RequirePermissions('client:update')
  @Audit({ action: 'client.note.delete', resource: 'client', module: CRM_MODULE })
  remove(
    @Param('clientId') clientId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notesService.remove(clientId, noteId);
  }
}
