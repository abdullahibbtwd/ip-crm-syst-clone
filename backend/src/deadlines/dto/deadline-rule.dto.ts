import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DeadlineEventType,
  DeadlineRuleTriggerType,
  MatterType,
} from '../../../generated/prisma/client';

export class CreateDeadlineRuleDto {
  @IsString()
  @MinLength(2)
  jurisdiction!: string;

  @IsEnum(MatterType)
  matterType!: MatterType;

  @IsEnum(DeadlineEventType)
  eventType!: DeadlineEventType;

  @IsEnum(DeadlineRuleTriggerType)
  triggerType!: DeadlineRuleTriggerType;

  @Type(() => Number)
  @IsInt()
  @Min(-3650)
  @Max(3650)
  daysOffset!: number;

  @IsOptional()
  @IsBoolean()
  isBusinessDays?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  gracePeriodDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateDeadlineRuleDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-3650)
  @Max(3650)
  daysOffset?: number;

  @IsOptional()
  @IsBoolean()
  isBusinessDays?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  gracePeriodDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  priority?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ListDeadlineRulesQueryDto {
  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsEnum(DeadlineRuleTriggerType)
  triggerType?: DeadlineRuleTriggerType;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
