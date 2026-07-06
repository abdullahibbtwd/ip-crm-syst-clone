import { Module } from '@nestjs/common';
import { PortalAccessModule } from '../common/portal-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PortalRenewalsController } from './portal-renewals.controller';
import { RenewalDeadlinesService } from './renewal-deadlines.service';
import { RenewalsController } from './renewals.controller';
import { RenewalsService } from './renewals.service';

@Module({
  imports: [NotificationsModule, PortalAccessModule],
  controllers: [RenewalsController, PortalRenewalsController],
  providers: [RenewalsService, RenewalDeadlinesService],
  exports: [RenewalsService, RenewalDeadlinesService],
})
export class RenewalsModule {}
