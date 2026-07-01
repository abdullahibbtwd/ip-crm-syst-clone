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
import type { AuthenticatedUser } from '../auth/auth.types';
import { DOCUMENTS_MODULE } from './documents.constants';
import { DocumentsService } from './documents.service';
import { MAX_UPLOAD_BYTES } from '../storage/storage.constants';

@Controller('documents')
@RequirePermissions('document:read')
@Audit({ action: 'document', resource: 'document', module: DOCUMENTS_MODULE })
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.documentsService.listVersions(id);
  }

  @Get(':id/download')
  download(@Param('id') id: string, @Query('versionId') versionId?: string) {
    return this.documentsService.getDownloadUrl(id, versionId);
  }

  @Post(':id/versions')
  @RequirePermissions('document:create')
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
