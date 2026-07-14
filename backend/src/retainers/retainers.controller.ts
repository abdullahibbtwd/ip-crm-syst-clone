import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { PortalAccessService } from '../common/portal-access.service';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import {
  ApplyRetainerDto,
  CreateRetainerAdjustmentDto,
  CreateRetainerDepositDto,
} from './dto/retainer.dto';
import { RetainersService } from './retainers.service';

const RETAINERS_MODULE = 'retainers';

@Controller('clients/:clientId/retainer')
@RequirePermissions('billing:read')
@Audit({ action: 'retainer', resource: 'retainer', module: RETAINERS_MODULE })
export class ClientRetainerController {
  constructor(private readonly retainers: RetainersService) {}

  @Get()
  get(@Param('clientId') clientId: string) {
    return this.retainers.getByClientId(clientId);
  }

  @Post('deposits')
  @RequirePermissions('billing:update')
  @Audit({
    action: 'retainer.deposit',
    resource: 'retainer',
    module: RETAINERS_MODULE,
  })
  deposit(
    @Param('clientId') clientId: string,
    @Body() body: CreateRetainerDepositDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.retainers.recordDeposit(clientId, body, user.userId);
  }

  @Post('adjustments')
  @RequirePermissions('billing:update')
  @Audit({
    action: 'retainer.adjustment',
    resource: 'retainer',
    module: RETAINERS_MODULE,
  })
  adjust(
    @Param('clientId') clientId: string,
    @Body() body: CreateRetainerAdjustmentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.retainers.recordAdjustment(clientId, body, user.userId);
  }
}

@Controller('invoices/:invoiceId/retainer')
@RequirePermissions('invoice:update')
@Audit({ action: 'retainer', resource: 'retainer', module: RETAINERS_MODULE })
export class InvoiceRetainerController {
  constructor(private readonly retainers: RetainersService) {}

  @Post('apply')
  @Audit({
    action: 'retainer.apply',
    resource: 'retainer',
    module: RETAINERS_MODULE,
  })
  apply(
    @Param('invoiceId') invoiceId: string,
    @Body() body: ApplyRetainerDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.retainers.applyToInvoice(invoiceId, body, user.userId);
  }
}

@Controller('portal/retainer')
@RequirePermissions('invoice:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({ action: 'retainer', resource: 'retainer', module: RETAINERS_MODULE })
export class PortalRetainerController {
  constructor(
    private readonly retainers: RetainersService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  get(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.retainers.getPortalBalance(clientId);
  }
}
