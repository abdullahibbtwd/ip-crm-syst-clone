import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  DeadlineStatus,
  MatterType,
} from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export class UpdateDeadlineStatusDto {
  @IsEnum(DeadlineStatus)
  status!: DeadlineStatus;
}

export const MY_DEADLINES_TABS = [
  'all',
  'pending',
  'in_progress',
  'overdue',
  'completed',
] as const;

export type MyDeadlinesTab = (typeof MY_DEADLINES_TABS)[number];

export class MyDeadlinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(DeadlineStatus)
  status?: DeadlineStatus;

  @IsOptional()
  @IsIn([...MY_DEADLINES_TABS])
  tab?: MyDeadlinesTab;
}

export class ListAllDeadlinesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsEnum(DeadlineStatus)
  status?: DeadlineStatus;

  @IsOptional()
  @IsDateString()
  dueFrom?: string;

  @IsOptional()
  @IsDateString()
  dueTo?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  overdue?: boolean;
}

export class CreateDeadlineDto {
  @IsUUID()
  matterId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  jurisdiction!: string;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  graceDate?: string;

  @IsUUID()
  assignedToId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
