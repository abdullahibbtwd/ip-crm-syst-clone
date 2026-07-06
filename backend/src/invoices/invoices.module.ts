import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import {
  InvoicesController,
  MatterInvoicesController,
  PortalInvoicesController,
} from './invoices.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [StorageModule],
  controllers: [
    MatterInvoicesController,
    InvoicesController,
    PortalInvoicesController,
  ],
  providers: [InvoicesService, InvoicePdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
