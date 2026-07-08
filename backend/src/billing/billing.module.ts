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
import { BillingOverviewController } from './billing-overview.controller';
import { BillingService } from './billing.service';
import { RateResolutionService } from './rate-resolution.service';
import { ReportsModule } from '../reports/reports.module';
import { BillingOverviewService } from './billing-overview.service';

@Module({
  imports: [ReportsModule],
  controllers: [
    RateCardsController,
    MatterTimeEntriesController,
    TimeEntriesController,
    MatterFixedFeesController,
    FixedFeesController,
    MatterBillingSummaryController,
    ClientBillingSummaryController,
    BillingOverviewController,
  ],
  providers: [BillingService, RateResolutionService, BillingOverviewService],
  exports: [BillingService, RateResolutionService],
})
export class BillingModule {}
