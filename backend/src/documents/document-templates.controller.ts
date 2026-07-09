import { Controller, Get } from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentTemplatesService } from './document-templates.service';

@Controller('document-templates')
@RequirePermissions('document:read')
@Audit({ action: 'document.template.list', resource: 'document_template', module: DOCUMENTS_MODULE })
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @Get()
  list() {
    return this.templates.listActive();
  }
}
