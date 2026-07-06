import { Module } from '@nestjs/common';
import {
  ClientBillingSummaryController,
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
    ClientBillingSummaryController,
  ],
  providers: [BillingService, RateResolutionService],
  exports: [BillingService, RateResolutionService],
})
export class BillingModule {}
