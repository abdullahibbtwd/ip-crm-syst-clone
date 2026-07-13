import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WatchModule } from '../watch/watch.module';
import { EpoStatusSchedulerService } from './epo-status-scheduler.service';
import { EpoStatusService } from './epo-status.service';
import { EpoDocumentProcessor } from './processors/epo-document.processor';
import { EpoStatusScanProcessor } from './processors/epo-status-scan.processor';
import { RegistryScanProcessor } from './processors/registry-scan.processor';
import { EpoProvider } from './providers/epo.provider';
import {
  EPO_DOCUMENT_FETCH_QUEUE,
  EPO_STATUS_SCAN_QUEUE,
  REGISTRY_SCAN_QUEUE,
} from './registry.constants';
import { RegistryController } from './registry.controller';
import { IntegrationsSettingsController } from './integrations-settings.controller';
import { RegistryScanSchedulerService } from './registry-scan-scheduler.service';
import { RegistryScanService } from './registry-scan.service';
import { RegistryService } from './registry.service';

@Module({
  imports: [
    AuditModule,
    CorrespondenceModule,
    DocumentsModule,
    NotificationsModule,
    WatchModule,
    BullModule.registerQueue(
      { name: REGISTRY_SCAN_QUEUE },
      { name: EPO_STATUS_SCAN_QUEUE },
      { name: EPO_DOCUMENT_FETCH_QUEUE },
    ),
  ],
  controllers: [RegistryController, IntegrationsSettingsController],
  providers: [
    EpoProvider,
    RegistryService,
    RegistryScanService,
    RegistryScanSchedulerService,
    RegistryScanProcessor,
    EpoStatusService,
    EpoStatusSchedulerService,
    EpoStatusScanProcessor,
    EpoDocumentProcessor,
  ],
  exports: [
    EpoProvider,
    RegistryService,
    RegistryScanService,
    EpoStatusService,
  ],
})
export class RegistryModule {}
