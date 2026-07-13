import {
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
import { DocumentQueryDto } from './dto/document.dto';
import { MAX_UPLOAD_BYTES } from '../storage/storage.constants';

@Controller('documents')
@RequirePermissions('document:read')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  @Audit({ action: 'document.list', resource: 'document', module: DOCUMENTS_MODULE })
  listFirm(
    @Query() query: DocumentQueryDto,
    @Query('matterId') matterId?: string,
  ) {
    return this.documentsService.listFirmWide({ ...query, matterId });
  }

  @Get(':id/versions')
  @Audit({ action: 'document.read', resource: 'document', module: DOCUMENTS_MODULE })
  async listVersions(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertDocumentAccess(id, user);
    return this.documentsService.listVersions(id);
  }

  @Get(':id/download')
  @Audit({
    action: 'document.download',
    resource: 'document',
    module: DOCUMENTS_MODULE,
    personalDataExport: true,
  })
  async download(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('versionId') versionId?: string,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertDocumentAccess(id, user);
    return this.documentsService.getDownloadUrl(id, versionId);
  }

  @Post(':id/versions')
  @RequirePermissions('document:create')
  @Audit({ action: 'document.upload', resource: 'document', module: DOCUMENTS_MODULE })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadVersion(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.documentsService.uploadVersion(id, file, user.userId);
  }
}
