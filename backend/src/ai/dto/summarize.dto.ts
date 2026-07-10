import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export const AI_SUMMARIZE_TARGET_TYPES = [
  'unlinked_email',
  'correspondence',
] as const;

export type AiSummarizeTargetType = (typeof AI_SUMMARIZE_TARGET_TYPES)[number];

export class SummarizeDto {
  @IsUUID()
  targetId!: string;

  @IsIn([...AI_SUMMARIZE_TARGET_TYPES])
  targetType!: AiSummarizeTargetType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  text?: string;
}
