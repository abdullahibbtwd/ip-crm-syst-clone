import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/auth.types';
import { CRM_MODULE } from '../crm.constants';
import { CreateRelatedCompanyDto } from './dto/related-company.dto';
import { RelatedCompaniesService } from './related-companies.service';

@Controller('clients/:clientId/related-companies')
@RequirePermissions('client:read')
@Audit({ action: 'related-companies', resource: 'client', module: CRM_MODULE })
export class RelatedCompaniesController {
  constructor(
    private readonly relatedCompaniesService: RelatedCompaniesService,
  ) {}

  @Post()
  @RequirePermissions('client:update')
  create(
    @Param('clientId') clientId: string,
    @Body() dto: CreateRelatedCompanyDto,
    @Req() req: Request,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.relatedCompaniesService.create(clientId, dto, user.userId);
  }

  @Get()
  findAll(@Param('clientId') clientId: string) {
    return this.relatedCompaniesService.findAll(clientId);
  }

  @Delete(':relId')
  @RequirePermissions('client:update')
  remove(@Param('clientId') clientId: string, @Param('relId') relId: string) {
    return this.relatedCompaniesService.remove(clientId, relId);
  }
}
