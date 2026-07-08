import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { RenewalsModule } from '../renewals/renewals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

@Module({
  imports: [ReportsModule, RenewalsModule, NotificationsModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}

