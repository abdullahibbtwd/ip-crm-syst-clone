import { Module } from '@nestjs/common';
import { PrecedentsController } from './precedents.controller';
import { PrecedentsService } from './precedents.service';

@Module({
  controllers: [PrecedentsController],
  providers: [PrecedentsService],
  exports: [PrecedentsService],
})
export class PrecedentsModule {}
