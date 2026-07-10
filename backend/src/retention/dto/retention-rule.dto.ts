import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RetentionAction } from '../../../generated/prisma/client';

export const RETENTION_ENTITY_TYPES = ['intake_leads', 'audit_logs'] as const;
export type RetentionEntityType = (typeof RETENTION_ENTITY_TYPES)[number];

export class CreateRetentionRuleDto {
  @IsIn([...RETENTION_ENTITY_TYPES])
  entityType!: RetentionEntityType;

  @IsOptional()
  @IsObject()
  conditionJson?: Record<string, unknown>;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36500)
  retentionDays!: number;

  @IsIn([RetentionAction.anonymize, RetentionAction.delete])
  action!: RetentionAction;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateRetentionRuleDto {
  @IsOptional()
  @IsObject()
  conditionJson?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(36500)
  retentionDays?: number;

  @IsOptional()
  @IsIn([RetentionAction.anonymize, RetentionAction.delete])
  action?: RetentionAction;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
