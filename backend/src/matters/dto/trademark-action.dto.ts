import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  LEGAL_BASIS_VALUES,
  TRADEMARK_ACTION_KINDS,
} from '../trademark-actions.constants';

export class GoodsServicesRowDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(45)
  classNumber!: number;

  @IsString()
  @MaxLength(20000)
  description!: string;
}

export class ReminderOffsetDto {
  @IsIn(['months', 'days'])
  unit!: 'months' | 'days';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(36)
  amount!: number;
}

export class TrademarkActionDto {
  @IsIn([...TRADEMARK_ACTION_KINDS])
  kind!: (typeof TRADEMARK_ACTION_KINDS)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GoodsServicesRowDto)
  goodsAndServices?: GoodsServicesRowDto[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  incomingReferenceNumber?: string;

  @IsOptional()
  @IsDateString()
  filingDate?: string;

  @IsOptional()
  @IsIn([...LEGAL_BASIS_VALUES])
  legalBasis?: (typeof LEGAL_BASIS_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  legalBasisOther?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;

  @IsOptional()
  @IsBoolean()
  generateProforma?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  governmentFeeAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  governmentFeeCurrency?: string;

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReminderOffsetDto)
  paymentReminder?: ReminderOffsetDto;

  @IsOptional()
  @IsDateString()
  filingDeadline?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ReminderOffsetDto)
  filingReminder?: ReminderOffsetDto;
}
