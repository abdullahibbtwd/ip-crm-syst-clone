import { Module } from '@nestjs/common';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';
import { HistoryService } from './history/history.service';
import { HoldingGroupsController } from './holding-groups/holding-groups.controller';
import { HoldingGroupsService } from './holding-groups/holding-groups.service';
import { OfficesController } from './offices/offices.controller';
import { OfficesService } from './offices/offices.service';
import { RelatedCompaniesController } from './related-companies/related-companies.controller';
import { RelatedCompaniesService } from './related-companies/related-companies.service';

@Module({
  controllers: [
    HoldingGroupsController,
    ClientsController,
    OfficesController,
    ContactsController,
    RelatedCompaniesController,
  ],
  providers: [
    HistoryService,
    HoldingGroupsService,
    ClientsService,
    OfficesService,
    ContactsService,
    RelatedCompaniesService,
  ],
  exports: [ClientsService, HistoryService],
})
export class CrmModule {}
