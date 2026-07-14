import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  ClientRetainerController,
  InvoiceRetainerController,
  PortalRetainerController,
} from './retainers.controller';
import { RetainersService } from './retainers.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    ClientRetainerController,
    InvoiceRetainerController,
    PortalRetainerController,
  ],
  providers: [RetainersService],
  exports: [RetainersService],
})
export class RetainersModule {}
