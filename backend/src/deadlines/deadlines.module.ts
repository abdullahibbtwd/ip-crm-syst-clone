import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineExplanationService } from './deadline-explanation.service';
import { DeadlineRulesController } from './deadline-rules.controller';
import { DeadlineRulesService } from './deadline-rules.service';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { OfficeActionDeadlinesService } from './office-action-deadlines.service';

@Module({
  imports: [NotificationsModule, AiModule],
  controllers: [DeadlinesController, DeadlineRulesController],
  providers: [
    DeadlinesService,
    OfficeActionDeadlinesService,
    DeadlineExplanationService,
    DeadlineRulesService,
  ],
  exports: [
    DeadlinesService,
    OfficeActionDeadlinesService,
    DeadlineRulesService,
  ],
})
export class DeadlinesModule {}
