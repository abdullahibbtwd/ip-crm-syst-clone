import { Module } from '@nestjs/common';
import { CrmModule } from '../crm/crm.module';
import { MattersModule } from '../matters/matters.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { ConflictCheckService } from './conflict-check.service';
import { IntakeController } from './intake.controller';
import { IntakeService } from './intake.service';

@Module({
  imports: [CrmModule, MattersModule, DeadlinesModule],
  controllers: [IntakeController],
  providers: [IntakeService, ConflictCheckService],
})
export class IntakeModule {}
