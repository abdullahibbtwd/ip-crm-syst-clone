import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SYSTEM_ROLES } from '../rbac/rbac.constants';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentTemplatesService } from './document-templates.service';
import {
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
} from './dto/document-template.dto';

@Controller('document-templates')
@RequirePermissions('document:read')
@Audit({
  action: 'document.template',
  resource: 'document_template',
  module: DOCUMENTS_MODULE,
})
export class DocumentTemplatesController {
  constructor(private readonly templates: DocumentTemplatesService) {}

  @Get()
  list() {
    return this.templates.listActive();
  }

  @Get('admin')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  listAdmin() {
    return this.templates.listAll();
  }

  @Get('merge-fields')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  mergeFields() {
    return { fields: this.templates.mergeFieldKeys() };
  }

  @Get(':id')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  findOne(@Param('id') id: string) {
    return this.templates.findByIdAdmin(id);
  }

  @Post()
  @RequirePermissions('document:create')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'document.template.create',
    resource: 'document_template',
    module: DOCUMENTS_MODULE,
  })
  create(@Body() dto: CreateDocumentTemplateDto) {
    return this.templates.create(dto);
  }

  @Post('preview')
  @RequirePermissions('document:read')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  preview(
    @Body()
    body: { id?: string; htmlBody?: string; referenceLine?: string | null },
  ) {
    return this.templates.previewPdf(body);
  }

  @Patch(':id')
  @RequirePermissions('document:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'document.template.update',
    resource: 'document_template',
    module: DOCUMENTS_MODULE,
  })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('document:update')
  @Roles(SYSTEM_ROLES.MANAGING_PARTNER, SYSTEM_ROLES.DOCKETING_ADMIN)
  @Audit({
    action: 'document.template.deactivate',
    resource: 'document_template',
    module: DOCUMENTS_MODULE,
  })
  deactivate(@Param('id') id: string) {
    return this.templates.deactivate(id);
  }
}
