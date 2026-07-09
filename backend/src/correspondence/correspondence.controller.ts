import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { PortalAccessService } from '../common/portal-access.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  isAllowedUploadMime,
  MAX_UPLOAD_BYTES,
} from '../storage/storage.constants';
import { CORRESPONDENCE_MODULE } from './correspondence.constants';
import { CorrespondenceService } from './correspondence.service';
import {
  CreateCorrespondenceDto,
  UpdateCorrespondenceDto,
} from './dto/correspondence.dto';
import { ParsePastedEmailDto } from './dto/parse-email.dto';
import { EmlParserService } from './eml-parser.service';

@Controller('matters/:matterId/correspondence')
@RequirePermissions('correspondence:read')
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class MatterCorrespondenceController {
  constructor(
    private readonly correspondenceService: CorrespondenceService,
    private readonly portalAccess: PortalAccessService,
    private readonly emlParser: EmlParserService,
  ) {}

  @Get()
  async list(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.correspondenceService.listForMatter(matterId);
  }

  @Post('parse-eml')
  @RequirePermissions('correspondence:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async parseEml(
    @Param('matterId') matterId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
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
  async parseText(
    @Param('matterId') matterId: string,
    @Body() dto: ParsePastedEmailDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.emlParser.parsePastedText(dto.text);
  }

  @Post()
  @RequirePermissions('correspondence:create')
  create(
    @Param('matterId') matterId: string,
    @Body() dto: CreateCorrespondenceDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.correspondenceService.create(matterId, dto, user.userId);
  }
}

@Controller('matters/:matterId/timeline')
@RequirePermissions('matter:read')
@Audit({
  action: 'timeline',
  resource: 'matter',
  module: CORRESPONDENCE_MODULE,
})
export class MatterTimelineController {
  constructor(
    private readonly correspondenceService: CorrespondenceService,
    private readonly portalAccess: PortalAccessService,
  ) {}

  @Get()
  async list(@Param('matterId') matterId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    await this.portalAccess.assertMatterAccess(matterId, user);
    return this.correspondenceService.listTimeline(matterId);
  }
}

@Controller('correspondence')
@RequirePermissions('correspondence:read')
@Audit({
  action: 'correspondence',
  resource: 'correspondence',
  module: CORRESPONDENCE_MODULE,
})
export class CorrespondenceController {
  constructor(private readonly correspondenceService: CorrespondenceService) {}

  @Patch(':id')
  @RequirePermissions('correspondence:update')
  update(@Param('id') id: string, @Body() dto: UpdateCorrespondenceDto) {
    return this.correspondenceService.update(id, dto);
  }
}
