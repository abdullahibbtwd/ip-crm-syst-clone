import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EpoStatusSchedulerService } from './epo-status-scheduler.service';
import { EpoStatusService } from './epo-status.service';
import { EpoStatusScanProcessor } from './processors/epo-status-scan.processor';
import { RegistryScanProcessor } from './processors/registry-scan.processor';
import { EpoProvider } from './providers/epo.provider';
import {
  EPO_STATUS_SCAN_QUEUE,
  REGISTRY_SCAN_QUEUE,
} from './registry.constants';
import { RegistryController } from './registry.controller';
import { RegistryScanSchedulerService } from './registry-scan-scheduler.service';
import { RegistryScanService } from './registry-scan.service';
import { RegistryService } from './registry.service';

@Module({
  imports: [
    CorrespondenceModule,
    NotificationsModule,
    BullModule.registerQueue(
      { name: REGISTRY_SCAN_QUEUE },
      { name: EPO_STATUS_SCAN_QUEUE },
    ),
  ],
  controllers: [RegistryController],
  providers: [
    EpoProvider,
    RegistryService,
    RegistryScanService,
    RegistryScanSchedulerService,
    RegistryScanProcessor,
    EpoStatusService,
    EpoStatusSchedulerService,
    EpoStatusScanProcessor,
  ],
  exports: [
    EpoProvider,
    RegistryService,
    RegistryScanService,
    EpoStatusService,
  ],
})
export class RegistryModule {}
