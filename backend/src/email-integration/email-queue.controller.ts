import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UnlinkedEmailStatus } from '../../generated/prisma/client';
import { Audit } from '../common/decorators/audit.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { EMAIL_INTEGRATION_MODULE } from './email-integration.constants';
import { EmailQueueQueryDto } from './dto/email-queue-query.dto';
import { LinkUnlinkedEmailDto } from './dto/link-unlinked-email.dto';
import { UnlinkedEmailService } from './unlinked-email.service';

@Controller('email-queue')
@RequirePermissions('email_queue:read')
@Audit({
  action: 'email_queue',
  resource: 'email_queue',
  module: EMAIL_INTEGRATION_MODULE,
})
export class EmailQueueController {
  constructor(private readonly queue: UnlinkedEmailService) {}

  @Get()
  list(@Query() query: EmailQueueQueryDto) {
    return this.queue.listQueue(query.status ?? UnlinkedEmailStatus.pending);
  }

  @Get('stats')
  stats() {
    return this.queue.getStats();
  }

  @Get(':id/preview')
  preview(@Param('id') id: string) {
    return this.queue.getPreview(id);
  }

  @Get(':id/download')
  download(@Param('id') id: string) {
    return this.queue.getDownloadUrl(id);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.queue.getById(id);
  }

  @Post(':id/link')
  @RequirePermissions('email_queue:link')
  link(
    @Param('id') id: string,
    @Body() dto: LinkUnlinkedEmailDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.queue.linkToMatter(
      id,
      dto.matterId,
      user.userId,
      user.roles,
      dto.category,
    );
  }

  @Post(':id/dismiss')
  @RequirePermissions('email_queue:link')
  dismiss(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.queue.dismiss(id, user.userId, user.roles);
  }
}
