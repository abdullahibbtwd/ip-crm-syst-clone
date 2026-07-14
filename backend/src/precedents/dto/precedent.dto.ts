import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { MatterType, PrecedentStatus } from '../../../generated/prisma/client';

export class CreatePrecedentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsString()
  @MinLength(1)
  bodyHtml!: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsUUID()
  sourceMatterId?: string;
}

export class UpdatePrecedentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  category?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyHtml?: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType | null;

  @IsOptional()
  @IsString()
  jurisdiction?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ListPrecedentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(PrecedentStatus)
  status?: PrecedentStatus;

  @IsOptional()
  @IsString()
  limit?: string;
}

export class HarvestPrecedentDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  category!: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
