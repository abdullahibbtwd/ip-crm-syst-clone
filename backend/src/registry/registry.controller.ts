import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { EpoStatusService } from './epo-status.service';
import { REGISTRY_MODULE } from './registry.constants';
import { RegistryScanService } from './registry-scan.service';
import { RegistryService } from './registry.service';

@Controller('registry')
export class RegistryController {
  constructor(
    private readonly registry: RegistryService,
    private readonly scan: RegistryScanService,
    private readonly epoStatus: EpoStatusService,
  ) {}

  @Get('epo/status')
  @RequirePermissions('registry:read')
  getEpoStatus() {
    return this.registry.getEpoStatus();
  }

  @Get('test/epo')
  @RequirePermissions('registry:read')
  @Audit({
    action: 'registry.test_epo',
    resource: 'registry',
    module: REGISTRY_MODULE,
  })
  testEpo(@Query('patentNumber') patentNumber?: string) {
    return this.registry.testEpoConnection(patentNumber);
  }

  /** Manual EPO watch scan for a client's active profiles → creates WatchAlerts. */
  @Post('scan/epo')
  @RequirePermissions('registry:read')
  @Audit({
    action: 'registry.scan_epo',
    resource: 'registry',
    module: REGISTRY_MODULE,
  })
  scanEpo(@Query('clientId') clientId: string) {
    return this.scan.scanEpoForClient(clientId);
  }

  /**
   * Manual prosecution status check for one IP right (EP + application number).
   * Creates correspondence (+ office-action deadlines) for new legal events.
   */
  @Get('epo/check/:ipRightId')
  @RequirePermissions('matter:update')
  @Audit({
    action: 'registry.epo_status_check',
    resource: 'registry',
    module: REGISTRY_MODULE,
  })
  checkEpoStatus(
    @Param('ipRightId') ipRightId: string,
    @Req() req: Request,
  ) {
    const actor = req.user as AuthenticatedUser;
    return this.epoStatus.checkIpRight(ipRightId, actor.userId);
  }
}
