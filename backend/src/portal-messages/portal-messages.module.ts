import { Module } from '@nestjs/common';
import { PortalAccessModule } from '../common/portal-access.module';
import { PortalMessagesController } from './portal-messages.controller';
import { PortalMessagesService } from './portal-messages.service';

@Module({
  imports: [PortalAccessModule],
  controllers: [PortalMessagesController],
  providers: [PortalMessagesService],
  exports: [PortalMessagesService],
})
export class PortalMessagesModule {}
