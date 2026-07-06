import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { OfficeActionDeadlinesService } from './office-action-deadlines.service';

@Module({
  imports: [NotificationsModule],
  controllers: [DeadlinesController],
  providers: [DeadlinesService, OfficeActionDeadlinesService],
  exports: [DeadlinesService, OfficeActionDeadlinesService],
})
export class DeadlinesModule {}
