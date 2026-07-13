import {
  Body,
  Controller,
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
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { AccountingExportService } from './accounting-export.service';
import {
  AccountingExportQueryDto,
  CreateInvoiceDto,
  ListInvoicesQueryDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/invoice.dto';
import { INVOICES_MODULE } from './invoices.constants';
import { InvoicesService } from './invoices.service';

@Controller('matters/:matterId/invoices')
@RequirePermissions('invoice:read')
@Audit({ action: 'invoice', resource: 'invoice', module: INVOICES_MODULE })
export class MatterInvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(@Param('matterId') matterId: string) {
    return this.invoices.listForMatter(matterId);
  }

  @Post()
  @RequirePermissions('invoice:create')
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateInvoiceDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.createDraft(matterId, dto, user.userId);
  }
}

@Controller('invoices')
@RequirePermissions('invoice:read')
@Audit({ action: 'invoice', resource: 'invoice', module: INVOICES_MODULE })
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly accountingExport: AccountingExportService,
  ) {}

  @Get()
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  listAll(@Query() query: ListInvoicesQueryDto) {
    return this.invoices.listAll(query);
  }

  @Get('export/accounting')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.FINANCE)
  @RequirePermissions('invoice:read')
  @Audit({
    action: 'invoice.accounting_export',
    resource: 'invoice',
    module: INVOICES_MODULE,
    personalDataExport: true,
  })
  exportAccounting(@Query() query: AccountingExportQueryDto) {
    return this.accountingExport.export(query);
  }

  @Get(':id/pdf')
  @Audit({
    action: 'invoice.export',
    resource: 'invoice',
    module: INVOICES_MODULE,
    personalDataExport: true,
  })
  getPdf(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.getPdfDownload(id, user);
  }

  @Get(':id')
  @Audit({ action: 'invoice.read', resource: 'invoice', module: INVOICES_MODULE })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('invoice:update')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoices.updateDraft(id, dto);
  }

  @Post(':id/issue')
  @RequirePermissions('invoice:update')
  issue(@Param('id') id: string) {
    return this.invoices.issue(id);
  }

  @Post(':id/void')
  @RequirePermissions('invoice:update')
  void(@Param('id') id: string) {
    return this.invoices.voidInvoice(id);
  }

  @Post(':id/payments')
  @RequirePermissions('invoice:update')
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.recordPayment(id, dto, user.userId);
  }
}

@Controller('portal/invoices')
@RequirePermissions('invoice:read')
@Roles(SYSTEM_ROLES.PORTAL_CLIENT)
@Audit({ action: 'invoice', resource: 'invoice', module: INVOICES_MODULE })
export class PortalInvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  list(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const clientId = this.portalAccess.requireScopeClientId(user)!;
    return this.invoices.listForPortalClient(clientId);
  }

  @Get(':id/pdf')
  @Audit({
    action: 'invoice.export',
    resource: 'invoice',
    module: INVOICES_MODULE,
    personalDataExport: true,
  })
  getPdf(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.getPdfDownload(id, user);
  }

  @Get(':id')
  @Audit({ action: 'invoice.read', resource: 'invoice', module: INVOICES_MODULE })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.invoices.findOne(id, user);
  }
}
