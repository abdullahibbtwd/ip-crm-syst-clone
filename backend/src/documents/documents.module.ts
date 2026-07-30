import { Module } from '@nestjs/common';
import { ClientDocumentsController } from './client-documents.controller';
import { DocumentTemplatesController } from './document-templates.controller';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocxTemplateService } from './docx-template.service';
import { MatterDocumentsController } from './matter-documents.controller';
import { PortalDocumentsController } from './portal-documents.controller';

@Module({
  controllers: [
    MatterDocumentsController,
    ClientDocumentsController,
    DocumentsController,
    PortalDocumentsController,
    DocumentTemplatesController,
  ],
  providers: [DocumentsService, DocumentTemplatesService, DocxTemplateService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
