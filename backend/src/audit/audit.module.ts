import { Module } from '@nestjs/common';
import { AuditController, ComplianceController } from './audit.controller';
import { AuditService } from './audit.service';

@Module({
  controllers: [AuditController, ComplianceController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
