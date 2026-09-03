import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ComplianceModule } from '../compliance/compliance.module';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { ContactsController, GlobalContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { HistoryService } from './history/history.service';
import { HoldingGroupsController } from './holding-groups/holding-groups.controller';
import { HoldingGroupsService } from './holding-groups/holding-groups.service';
import { OfficesController } from './offices/offices.controller';
import { OfficesService } from './offices/offices.service';
import { RelatedCompaniesController } from './related-companies/related-companies.controller';
import { RelatedCompaniesService } from './related-companies/related-companies.service';
import { ClientNotesController } from './notes/client-notes.controller';
import { ClientNotesService } from './notes/client-notes.service';

@Module({
  imports: [AuditModule, ComplianceModule],
  controllers: [
    HoldingGroupsController,
    ClientsController,
    OfficesController,
    GlobalContactsController,
    ContactsController,
    RelatedCompaniesController,
    ClientNotesController,
  ],
  providers: [
    HistoryService,
    HoldingGroupsService,
    ClientsService,
    OfficesService,
    ContactsService,
    RelatedCompaniesService,
    ClientNotesService,
  ],
  exports: [ClientsService, HistoryService],
})
export class CrmModule {}
