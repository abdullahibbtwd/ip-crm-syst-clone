import { Module } from '@nestjs/common';
import {
  FixedFeesController,
  MatterBillingSummaryController,
  MatterFixedFeesController,
  MatterTimeEntriesController,
  RateCardsController,
  TimeEntriesController,
} from './billing.controller';
import { BillingService } from './billing.service';
import { RateResolutionService } from './rate-resolution.service';

@Module({
  controllers: [
    RateCardsController,
    MatterTimeEntriesController,
    TimeEntriesController,
    MatterFixedFeesController,
    FixedFeesController,
    MatterBillingSummaryController,
  ],
  providers: [BillingService, RateResolutionService],
  exports: [BillingService, RateResolutionService],
})
export class BillingModule {}
