import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHolidayDto {
  @IsString()
  @MinLength(2)
  jurisdiction!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  jurisdiction?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;
}

export class ListHolidaysQueryDto {
  @IsOptional()
  @IsString()
  jurisdiction?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
