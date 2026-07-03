import { Global, Module } from '@nestjs/common';
import { PortalAccessService } from './portal-access.service';

@Global()
@Module({
  providers: [PortalAccessService],
  exports: [PortalAccessService],
})
export class PortalAccessModule {}
