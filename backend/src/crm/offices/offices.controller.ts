import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CLIENT_OFFICE_ADDRESS_TYPE,
  TYPED_ADDRESS_TYPE_PARAM,
  type ClientOfficeAddressTypeValue,
} from './client-office-address.util';
import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import { CreateOfficeDto, UpdateOfficeDto } from './dto/office.dto';
import { UpsertTypedAddressDto } from './dto/upsert-typed-address.dto';
import { OfficesService } from './offices.service';

@Controller('clients/:clientId/offices')
@RequirePermissions('client:read')
@Audit({ action: 'offices', resource: 'client', module: CRM_MODULE })
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Post()
  @RequirePermissions('client:update')
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateOfficeDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.officesService.create(clientId, dto, user.userId);
  }

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.officesService.findAll(clientId);
  }

  @Put('by-type/:addressType')
  @RequirePermissions('client:update')
  upsertTyped(
    @Param('clientId') clientId: string,
    @Param(
      'addressType',
      new ParseEnumPipe(TYPED_ADDRESS_TYPE_PARAM, {
        exceptionFactory: () =>
          new BadRequestException(
            'Address type must be registered_legal or correspondence',
          ),
      }),
    )
    addressType: ClientOfficeAddressTypeValue,
    @Body() dto: UpsertTypedAddressDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.officesService.upsertTypedAddress(
      clientId,
      addressType,
      dto,
      user.userId,
    );
  }

  @Patch(':officeId')
  @RequirePermissions('client:update')
  update(
    @Param('clientId') clientId: string,
    @Param('officeId') officeId: string,
    @Body() dto: UpdateOfficeDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.officesService.update(clientId, officeId, dto, user.userId);
  }

  @Delete(':officeId')
  @RequirePermissions('client:update')
  remove(
    @Param('clientId') clientId: string,
    @Param('officeId') officeId: string,
  ) {
    return this.officesService.remove(clientId, officeId);
  }
}
