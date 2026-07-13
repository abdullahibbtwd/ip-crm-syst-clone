import { Module } from '@nestjs/common';
import { PortalAccessModule } from '../common/portal-access.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import {
  CorrespondenceController,
  MatterCorrespondenceController,
  MatterTimelineController,
} from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
import { EmlParserService } from './eml-parser.service';
import { PortalCorrespondenceController } from './portal-correspondence.controller';

@Module({
  imports: [DeadlinesModule, PortalAccessModule],
  controllers: [
    MatterCorrespondenceController,
    MatterTimelineController,
    CorrespondenceController,
    PortalCorrespondenceController,
  ],
  providers: [CorrespondenceService, EmlParserService],
  exports: [CorrespondenceService, EmlParserService],
})
export class CorrespondenceModule {}
