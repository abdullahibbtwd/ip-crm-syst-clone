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

@Controller('shared-documents')
@RequirePermissions('document:read')
@Audit({ action: 'document', resource: 'document', module: DOCUMENTS_MODULE })
export class SharedDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@Query() query: DocumentQueryDto) {
    return this.documentsService.listShared(query);
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
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.documentsService.uploadShared(file, dto, user.userId);
  }

  @Get(':documentId/versions')
  listVersions(@Param('documentId') documentId: string) {
    return this.documentsService.listSharedVersions(documentId);
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
    @Query('disposition') disposition?: string,
    @Query('publicHost') publicHost?: string,
  ) {
    return this.documentsService.getSharedDownloadUrl(
      documentId,
      versionId,
      disposition === 'inline' || disposition === 'attachment'
        ? disposition
        : undefined,
      publicHost,
    );
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
    return this.documentsService.uploadSharedVersion(
      documentId,
      file,
      user.userId,
    );
  }
}
