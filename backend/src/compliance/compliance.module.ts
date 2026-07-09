import { Module } from '@nestjs/common';
import { GdprExportService } from './gdpr-export.service';

@Module({
  providers: [GdprExportService],
  exports: [GdprExportService],
})
export class ComplianceModule {}
