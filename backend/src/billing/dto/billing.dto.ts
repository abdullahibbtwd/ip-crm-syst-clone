import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  BillingRateRole,
  FixedFeeCategory,
  MatterType,
} from '../../../generated/prisma/client';

export class CreateRateCardDto {
  @IsEnum(BillingRateRole)
  role!: BillingRateRole;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

export class UpdateRateCardDto {
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  hourlyRate?: number;
}

export class ResolveRateQueryDto {
  @IsUUID()
  matterId!: string;

  @IsOptional()
  @IsEnum(BillingRateRole)
  role?: BillingRateRole;
}

export class CreateTimeEntryDto {
  @IsDateString()
  date!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  hours!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rateSnapshot?: number;
}

export class UpdateTimeEntryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  hours?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rateSnapshot?: number;
}

export class CreateFixedFeeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsEnum(FixedFeeCategory)
  category!: FixedFeeCategory;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}

export class UpdateFixedFeeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(FixedFeeCategory)
  category?: FixedFeeCategory;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
