import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../common/decorators/audit.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { ALERTS_MODULE } from './alerts.constants';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@Audit({ action: 'alerts', resource: 'alert', module: ALERTS_MODULE })
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('summary')
  async summary(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.alerts.getSummary(user);
  }
}

