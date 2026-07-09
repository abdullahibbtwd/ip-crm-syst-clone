import { Module } from '@nestjs/common';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import {
  CorrespondenceController,
  MatterCorrespondenceController,
  MatterTimelineController,
} from './correspondence.controller';
import { CorrespondenceService } from './correspondence.service';
import { EmlParserService } from './eml-parser.service';

@Module({
  imports: [DeadlinesModule],
  controllers: [
    MatterCorrespondenceController,
    MatterTimelineController,
    CorrespondenceController,
  ],
  providers: [CorrespondenceService, EmlParserService],
  exports: [CorrespondenceService, EmlParserService],
})
export class CorrespondenceModule {}
