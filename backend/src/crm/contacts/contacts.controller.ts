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
import { Audit, SkipAudit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';
import { ContactsService } from './contacts.service';

@Controller('contacts')
@RequirePermissions('client:read')
export class GlobalContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @SkipAudit()
  findAllGlobal(@Query() query: ContactQueryDto) {
    return this.contactsService.findAllGlobal(query);
  }
}

@Controller('clients/:clientId/contacts')
@RequirePermissions('client:read')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermissions('client:update')
  @Audit({ action: 'contact.create', resource: 'client', module: CRM_MODULE })
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContactDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.contactsService.create(clientId, dto, user.userId);
  }

  @Get()
  @Audit({ action: 'contact.read', resource: 'client', module: CRM_MODULE })
  findAll(
    @Param('clientId') clientId: string,
    @Query() query: ContactQueryDto,
  ) {
    return this.contactsService.findAll(clientId, query);
  }

  @Patch(':contactId')
  @RequirePermissions('client:update')
  @Audit({ action: 'contact.update', resource: 'client', module: CRM_MODULE })
  update(
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.contactsService.update(clientId, contactId, dto, user.userId);
  }

  @Delete(':contactId')
  @RequirePermissions('client:update')
  @Audit({ action: 'contact.deactivate', resource: 'client', module: CRM_MODULE })
  deactivate(
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.deactivate(clientId, contactId);
  }
}
