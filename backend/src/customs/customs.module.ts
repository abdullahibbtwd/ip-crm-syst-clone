import { Module } from '@nestjs/common';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { CustomsController } from './customs.controller';
import { CustomsService } from './customs.service';

@Module({
  imports: [DeadlinesModule],
  controllers: [CustomsController],
  providers: [CustomsService],
  exports: [CustomsService],
})
export class CustomsModule {}
