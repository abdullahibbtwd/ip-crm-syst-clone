import { Controller, Get, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SkipAudit } from '../common/decorators/audit.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SearchService } from './search.service';

@Controller('search')
@SkipAudit()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Query('q') q: string | undefined, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.search.search(q ?? '', user);
  }
}
