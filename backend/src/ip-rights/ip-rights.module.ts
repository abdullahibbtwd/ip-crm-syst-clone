import { Module } from '@nestjs/common'
import { PortalAccessModule } from '../common/portal-access.module'
import { IpRightsController } from './ip-rights.controller'
import { IpRightsService } from './ip-rights.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule, PortalAccessModule],
  controllers: [IpRightsController],
  providers: [IpRightsService],
  exports: [IpRightsService],
})
export class IpRightsModule {}

