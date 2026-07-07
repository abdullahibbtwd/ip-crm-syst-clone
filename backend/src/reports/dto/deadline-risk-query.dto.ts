import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { MAX_DEADLINE_RISK_WINDOW_DAYS } from '../reports.constants';

export class DeadlineRiskQueryDto {
  /** Include overdue/missed/escalated plus deadlines due within this many days (default 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_DEADLINE_RISK_WINDOW_DAYS)
  dueWithinDays?: number;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}
