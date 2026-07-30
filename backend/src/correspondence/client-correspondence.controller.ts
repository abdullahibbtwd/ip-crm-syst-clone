import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import {
  isAllowedUploadMime,
  MAX_UPLOAD_BYTES,
} from '../storage/storage.constants';
import { CORRESPONDENCE_MODULE } from './correspondence.constants';
import { CorrespondenceService } from './correspondence.service';
import { CreateCorrespondenceDto } from './dto/correspondence.dto';
import { ParsePastedEmailDto } from './dto/parse-email.dto';
import { EmlParserService } from './eml-parser.service';

@Controller('clients/:clientId/correspondence')
@RequirePermissions('correspondence:read')
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class ClientCorrespondenceController {
  constructor(
    private readonly correspondenceService: CorrespondenceService,
    private readonly emlParser: EmlParserService,
  ) {}

  @Get()
  list(@Param('clientId') clientId: string) {
    return this.correspondenceService.listUnifiedForClient(clientId);
  }

  @Post('parse-eml')
  @RequirePermissions('correspondence:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async parseEml(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Email file is required');
    }
    if (!isAllowedUploadMime(file.mimetype, file.originalname)) {
      throw new BadRequestException(
        'Upload a valid .eml file saved from Outlook or Gmail',
      );
    }
    return this.emlParser.parseBuffer(file.buffer);
  }

  @Post('parse-text')
  @RequirePermissions('correspondence:create')
  parseText(@Body() dto: ParsePastedEmailDto) {
    return this.emlParser.parsePastedText(dto.text);
  }

  @Post()
  @RequirePermissions('correspondence:create')
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateCorrespondenceDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.correspondenceService.createForClient(
      clientId,
      dto,
      user.userId,
    );
  }
}
