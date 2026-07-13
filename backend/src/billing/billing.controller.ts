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
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { BILLING_MODULE } from './billing.constants';
import { BillingService } from './billing.service';
import {
  CreateFixedFeeDto,
  CreateRateCardDto,
  CreateTimeEntryDto,
  ResolveRateQueryDto,
  UpdateFixedFeeDto,
  UpdateRateCardDto,
  UpdateTimeEntryDto,
} from './dto/billing.dto';

@Controller('rate-cards')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class RateCardsController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  list() {
    return this.billing.listRateCards();
  }

  @Get('resolve')
  resolve(@Query() query: ResolveRateQueryDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.billing.resolveRate(
      query.matterId,
      user.roles,
      query.role,
    );
  }

  @Post()
  @RequirePermissions('billing:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  create(@Body() dto: CreateRateCardDto) {
    return this.billing.createRateCard(dto);
  }

  @Patch(':id')
  @RequirePermissions('billing:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  update(@Param('id') id: string, @Body() dto: UpdateRateCardDto) {
    return this.billing.updateRateCard(id, dto);
  }
}

@Controller('matters/:matterId/time-entries')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class MatterTimeEntriesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@Param('matterId') matterId: string) {
    return this.billing.listTimeEntries(matterId);
  }

  @Post()
  @RequirePermissions('billing:create')
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateTimeEntryDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.billing.createTimeEntry(
      matterId,
      dto,
      user.userId,
      user.roles,
    );
  }
}

@Controller('time-entries')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class TimeEntriesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  listAll(
    @Query('matterId') matterId?: string,
    @Query('loggedById') loggedById?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billing.listAllTimeEntries({
      matterId,
      loggedById,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id')
  @RequirePermissions('billing:update')
  update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.billing.updateTimeEntry(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('billing:delete')
  remove(@Param('id') id: string) {
    return this.billing.deleteTimeEntry(id);
  }
}

@Controller('matters/:matterId/fixed-fees')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class MatterFixedFeesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list(@Param('matterId') matterId: string) {
    return this.billing.listFixedFees(matterId);
  }

  @Post()
  @RequirePermissions('billing:create')
  create(@Param('matterId') matterId: string, @Body() dto: CreateFixedFeeDto) {
    return this.billing.createFixedFee(matterId, dto);
  }
}

@Controller('fixed-fees')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class FixedFeesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  listAll(
    @Query('category') category?: string,
    @Query('matterId') matterId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billing.listAllFixedFees({
      category,
      matterId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Patch(':id')
  @RequirePermissions('billing:update')
  update(@Param('id') id: string, @Body() dto: UpdateFixedFeeDto) {
    return this.billing.updateFixedFee(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('billing:delete')
  remove(@Param('id') id: string) {
    return this.billing.deleteFixedFee(id);
  }
}

@Controller('matters/:matterId/billing-summary')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class MatterBillingSummaryController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  get(@Param('matterId') matterId: string) {
    return this.billing.getBillingSummary(matterId);
  }
}

@Controller('clients/:clientId/billing-summary')
@RequirePermissions('billing:read')
@Audit({ action: 'billing', resource: 'billing', module: BILLING_MODULE })
export class ClientBillingSummaryController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  get(@Param('clientId') clientId: string) {
    return this.billing.getClientBillingSummary(clientId);
  }
}
