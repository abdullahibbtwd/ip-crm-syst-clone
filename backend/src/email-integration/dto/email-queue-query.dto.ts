import { IsEnum, IsOptional } from 'class-validator';
import { UnlinkedEmailStatus } from '../../../generated/prisma/client';

export class EmailQueueQueryDto {
  @IsOptional()
  @IsEnum(UnlinkedEmailStatus)
  status?: UnlinkedEmailStatus;
}
