import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PartnerInstructionStatus } from '../../../generated/prisma/client';

export class CreatePartnerInstructionDto {
  @IsUUID()
  partnerId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @IsOptional()
  @IsUUID()
  deadlineId?: string;
}

export class UpdatePartnerInstructionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string | null;

  @IsOptional()
  @IsUUID()
  deadlineId?: string | null;
}

export class TransitionPartnerInstructionDto {
  @IsEnum(PartnerInstructionStatus)
  status!: PartnerInstructionStatus;
}

export class ListMatterInstructionsQueryDto {
  @IsOptional()
  @IsEnum(PartnerInstructionStatus)
  status?: PartnerInstructionStatus;
}
