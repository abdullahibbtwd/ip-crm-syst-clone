import { Module } from '@nestjs/common';
import { PortalAccessModule } from '../common/portal-access.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MatterPartnerInstructionsController } from './matter-partner-instructions.controller';
import { PartnerInstructionsService } from './partner-instructions.service';
import { PartnersController } from './partners.controller';
import { PartnersService } from './partners.service';

@Module({
  imports: [NotificationsModule, PortalAccessModule],
  controllers: [PartnersController, MatterPartnerInstructionsController],
  providers: [PartnersService, PartnerInstructionsService],
  exports: [PartnersService, PartnerInstructionsService],
})
export class PartnersModule {}
