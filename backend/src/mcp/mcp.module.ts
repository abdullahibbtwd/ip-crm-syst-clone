import { Module } from '@nestjs/common';
import { CorrespondenceModule } from '../correspondence/correspondence.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { EmailIntegrationModule } from '../email-integration/email-integration.module';
import { MattersModule } from '../matters/matters.module';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [
    DeadlinesModule,
    CorrespondenceModule,
    MattersModule,
    EmailIntegrationModule,
  ],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
