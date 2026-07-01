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
import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import {
  ContactQueryDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/contact.dto';
import { ContactsService } from './contacts.service';

@Controller('clients/:clientId/contacts')
@RequirePermissions('client:read')
@Audit({ action: 'contacts', resource: 'client', module: CRM_MODULE })
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermissions('client:update')
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateContactDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.contactsService.create(clientId, dto, user.userId);
  }

  @Get()
  findAll(
    @Param('clientId') clientId: string,
    @Query() query: ContactQueryDto,
  ) {
    return this.contactsService.findAll(clientId, query);
  }

  @Patch(':contactId')
  @RequirePermissions('client:update')
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
  deactivate(
    @Param('clientId') clientId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.contactsService.deactivate(clientId, contactId);
  }
}
