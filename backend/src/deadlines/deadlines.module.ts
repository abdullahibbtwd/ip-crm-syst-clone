import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineExplanationService } from './deadline-explanation.service';
import { DeadlineRulesController } from './deadline-rules.controller';
import { DeadlineRulesService } from './deadline-rules.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { HolidaysController } from './holidays.controller';
import { HolidaysService } from './holidays.service';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';
import { CustomsSeizureDeadlinesService } from './customs-seizure-deadlines.service';
import { OfficeActionDeadlinesService } from './office-action-deadlines.service';

@Module({
  imports: [NotificationsModule, AiModule],
  controllers: [
    DeadlinesController,
    DeadlineRulesController,
    HolidaysController,
    JurisdictionsController,
  ],
  providers: [
    DeadlinesService,
    OfficeActionDeadlinesService,
    CustomsSeizureDeadlinesService,
    DeadlineExplanationService,
    DeadlineRulesService,
    HolidaysService,
    JurisdictionsService,
  ],
  exports: [
    DeadlinesService,
    OfficeActionDeadlinesService,
    CustomsSeizureDeadlinesService,
    DeadlineRulesService,
    HolidaysService,
    JurisdictionsService,
  ],
})
export class DeadlinesModule {}
