import { Module } from '@nestjs/common';
import { DeadlinesController } from './deadlines.controller';
import { DeadlinesService } from './deadlines.service';
import { OfficeActionDeadlinesService } from './office-action-deadlines.service';

@Module({
  controllers: [DeadlinesController],
  providers: [DeadlinesService, OfficeActionDeadlinesService],
  exports: [DeadlinesService, OfficeActionDeadlinesService],
})
export class DeadlinesModule {}
