import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BroadcastAudience } from '../../../generated/prisma/client';

export class PreviewBroadcastAudienceDto {
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  clientIds?: string[];
}

export class CreateBroadcastDto {
  @IsEnum(BroadcastAudience)
  audience!: BroadcastAudience;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500_000)
  bodyText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  bodyHtml?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  clientIds?: string[];
}
