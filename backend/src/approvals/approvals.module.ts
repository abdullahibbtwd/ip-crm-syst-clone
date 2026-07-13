import { Module } from '@nestjs/common';
import { PortalAccessModule } from '../common/portal-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ApprovalsService } from './approvals.service';
import { MatterApprovalsController } from './matter-approvals.controller';
import { PortalApprovalsController } from './portal-approvals.controller';

@Module({
  imports: [NotificationsModule, PortalAccessModule],
  controllers: [MatterApprovalsController, PortalApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
