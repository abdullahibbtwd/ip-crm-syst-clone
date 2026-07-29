import { JurisdictionType } from '../../../generated/prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateJurisdictionDto {
  @IsString()
  @Length(2, 4)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  officeName!: string;

  @IsOptional()
  @IsEnum(JurisdictionType)
  type?: JurisdictionType;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class UpdateJurisdictionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  officeName?: string;

  @IsOptional()
  @IsEnum(JurisdictionType)
  type?: JurisdictionType;

  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  sortOrder?: number;
}

export class ListJurisdictionsQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  activeOnly?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  priorityOnly?: boolean;

  @IsOptional()
  @IsEnum(JurisdictionType)
  type?: JurisdictionType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  q?: string;
}
