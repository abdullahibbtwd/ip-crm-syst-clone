import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { MatterDocumentsController } from './matter-documents.controller';
import { PortalDocumentsController } from './portal-documents.controller';

@Module({
  controllers: [MatterDocumentsController, DocumentsController, PortalDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
