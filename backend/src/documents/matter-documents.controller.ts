import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentsService } from './documents.service';
import { DocumentQueryDto, UploadDocumentDto } from './dto/document.dto';
import { GenerateDocumentDto } from './dto/generate-document.dto';
import { MAX_UPLOAD_BYTES } from '../storage/storage.constants';

@Controller('matters/:matterId/documents')
@RequirePermissions('document:read')
@Audit({ action: 'document', resource: 'document', module: DOCUMENTS_MODULE })
export class MatterDocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(
    @Param('matterId') matterId: string,
    @Query() query: DocumentQueryDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.documentsService.listForMatter(matterId, query);
  }

  @Post('generate')
  @RequirePermissions('document:create')
  @Audit({ action: 'document.generate', resource: 'document', module: DOCUMENTS_MODULE })
  generate(
    @Param('matterId') matterId: string,
    @Body() dto: GenerateDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.portalAccess
      .assertMatterAccess(matterId, user)
      .then(() =>
        this.documentsService.generateFromTemplate(
          matterId,
          dto.templateId,
          user.userId,
          dto.format ?? 'pdf',
          dto.fields,
        ),
      );
  }

  @Post()
  @RequirePermissions('document:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  upload(
    @Param('matterId') matterId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.documentsService.upload(matterId, file, dto, user.userId);
  }
}
