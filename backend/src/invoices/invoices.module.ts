import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { AccountingExportService } from './accounting-export.service';
import { AccountingIntegrationsController } from './accounting-integrations.controller';
import { AccountingSyncService } from './accounting-sync.service';
import { ACCOUNTING_SYNC_QUEUE } from './accounting-sync.constants';
import {
  InvoicesController,
  MatterInvoicesController,
  PortalInvoicesController,
} from './invoices.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';
import { AccountingSyncProcessor } from './processors/accounting-sync.processor';

@Module({
  imports: [
    StorageModule,
    AuditModule,
    BullModule.registerQueue({ name: ACCOUNTING_SYNC_QUEUE }),
  ],
  controllers: [
    MatterInvoicesController,
    InvoicesController,
    PortalInvoicesController,
    AccountingIntegrationsController,
  ],
  providers: [
    InvoicesService,
    InvoicePdfService,
    AccountingExportService,
    AccountingSyncService,
    AccountingSyncProcessor,
  ],
  exports: [InvoicesService, AccountingExportService, AccountingSyncService],
})
export class InvoicesModule {}
