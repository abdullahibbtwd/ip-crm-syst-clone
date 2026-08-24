import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { RenewalsModule } from '../renewals/renewals.module';
import { MattersController } from './matters.controller';
import { MattersService } from './matters.service';
import { TrademarkActionsService } from './trademark-actions.service';

@Module({
  imports: [DeadlinesModule, RenewalsModule, BillingModule, InvoicesModule],
  controllers: [MattersController],
  providers: [MattersService, TrademarkActionsService],
  exports: [MattersService],
})
export class MattersModule {}
