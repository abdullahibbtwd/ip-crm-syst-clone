import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
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
