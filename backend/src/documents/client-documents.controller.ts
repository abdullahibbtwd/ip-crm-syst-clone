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
import type { AuthenticatedUser } from '../auth/auth.types';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentsService } from './documents.service';
import { DocumentQueryDto, UploadDocumentDto } from './dto/document.dto';
import { MAX_UPLOAD_BYTES } from '../storage/storage.constants';

@Controller('clients/:clientId/documents')
@RequirePermissions('document:read')
@Audit({ action: 'document', resource: 'document', module: DOCUMENTS_MODULE })
export class ClientDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Param('clientId') clientId: string, @Query() query: DocumentQueryDto) {
    return this.documentsService.listUnifiedForClient(clientId, query);
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
    @Param('clientId') clientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.documentsService.uploadForClient(
      clientId,
      file,
      dto,
      user.userId,
    );
  }

  @Get(':documentId/versions')
  listVersions(@Param('documentId') documentId: string) {
    return this.documentsService.listClientVersions(documentId);
  }

  @Get(':documentId/download')
  @Audit({
    action: 'document.download',
    resource: 'document',
    module: DOCUMENTS_MODULE,
    personalDataExport: true,
  })
  download(
    @Param('documentId') documentId: string,
    @Query('versionId') versionId?: string,
  ) {
    return this.documentsService.getClientDownloadUrl(documentId, versionId);
  }

  @Post(':documentId/versions')
  @RequirePermissions('document:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  uploadVersion(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.documentsService.uploadClientVersion(
      documentId,
      file,
      user.userId,
    );
  }
}
