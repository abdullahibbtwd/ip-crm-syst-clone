import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  WatchFrequency,
  WatchProfileStatus,
} from '../../../generated/prisma/client';
import { WATCH_CANONICAL_JURISDICTIONS } from '../watch.constants';

export class CreateWatchProfileDto {
  @IsString()
  @MinLength(1)
  markText!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsIn(WATCH_CANONICAL_JURISDICTIONS, { each: true })
  jurisdictions!: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(45, { each: true })
  niceClasses?: number[];

  @IsOptional()
  @IsEnum(WatchFrequency)
  frequency?: WatchFrequency;
}

export class UpdateWatchProfileDto {
  @IsEnum(WatchProfileStatus)
  status!: WatchProfileStatus;
}
