import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ListRenewalsQueryDto } from './dto/renewal-query.dto';
import {
  CompleteRenewalDto,
  InstructRenewalDto,
} from './dto/renewal-workflow.dto';
import { RENEWALS_MODULE } from './renewals.constants';
import { RenewalsService } from './renewals.service';

@Controller('renewals')
@RequirePermissions('renewal:read')
@Audit({ action: 'renewal', resource: 'renewal', module: RENEWALS_MODULE })
export class RenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get('my')
  listMy(@Query() query: ListRenewalsQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.renewals.listMy(user, query);
  }

  @Get()
  listAll(@Query() query: ListRenewalsQueryDto) {
    return this.renewals.listAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.renewals.findOne(id);
  }

  @Post(':id/instruct')
  @RequirePermissions('renewal:update')
  instruct(
    @Param('id') id: string,
    @Body() dto: InstructRenewalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.renewals.instruct(id, dto, user.userId);
  }

  @Post(':id/file')
  @RequirePermissions('renewal:update')
  markFiled(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.renewals.markFiled(id, user.userId);
  }

  @Post(':id/complete')
  @RequirePermissions('renewal:update')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteRenewalDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.renewals.complete(id, dto, user.userId);
  }
}
