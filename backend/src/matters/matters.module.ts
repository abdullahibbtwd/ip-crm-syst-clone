import { Module } from '@nestjs/common';
import { DeadlinesModule } from '../deadlines/deadlines.module';
import { MattersController } from './matters.controller';
import { MattersService } from './matters.service';

@Module({
  imports: [DeadlinesModule],
  controllers: [MattersController],
  providers: [MattersService],
  exports: [MattersService],
})
export class MattersModule {}
