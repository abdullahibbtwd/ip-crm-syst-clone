import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RenewalInstructionDecision } from '../../../generated/prisma/client';

export class InstructRenewalDto {
  @IsEnum(RenewalInstructionDecision)
  decision!: RenewalInstructionDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateRenewalWindowDto {
  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsDateString()
  graceDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cycleNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  jurisdiction?: string;
}

export class CompleteRenewalDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  officialFeeAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceFeeAmount?: number;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsUUID()
  proofDocumentVersionId?: string;
}

export class SplitRenewalPartDto {
  @IsString()
  @MaxLength(10)
  jurisdiction!: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  niceClasses?: number[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  officialFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class SplitRenewalWindowDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SplitRenewalPartDto)
  parts!: SplitRenewalPartDto[];
}

export class RecordRenewalPartPaymentDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsUUID()
  proofDocumentVersionId?: string;
}
