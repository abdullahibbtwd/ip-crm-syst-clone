import { Module } from '@nestjs/common';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MatterDocumentsController } from './matter-documents.controller';
import { PortalDocumentsController } from './portal-documents.controller';

@Module({
  controllers: [
    MatterDocumentsController,
    DocumentsController,
    PortalDocumentsController,
    DocumentTemplatesController,
  ],
  providers: [DocumentsService, DocumentTemplatesService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
