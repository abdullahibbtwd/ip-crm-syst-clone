import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import {
  CustodyAction,
  CustomsApplicationStatus,
  CustomsSeizureStatus,
} from '../../../generated/prisma/client';

export class CreateCustomsSeizureDto {
  @IsDateString()
  seizureDate!: string;

  @IsString()
  @MinLength(1)
  customsOffice!: string;

  @IsString()
  @MinLength(1)
  goodsDescription!: string;

  @IsOptional()
  @IsString()
  consignmentReference?: string;

  @IsOptional()
  @IsString()
  quantity?: string;

  @IsOptional()
  @IsString()
  portOfEntry?: string;
}

export class UpdateCustomsSeizureDto {
  @IsOptional()
  @IsDateString()
  seizureDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  customsOffice?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  goodsDescription?: string;

  @IsOptional()
  @IsString()
  consignmentReference?: string | null;

  @IsOptional()
  @IsString()
  quantity?: string | null;

  @IsOptional()
  @IsString()
  portOfEntry?: string | null;

  @IsOptional()
  @IsEnum(CustomsSeizureStatus)
  status?: CustomsSeizureStatus;

  @IsOptional()
  @IsUUID()
  linkedMatterId?: string | null;
}

export class CreateCustodyLogDto {
  @IsEnum(CustodyAction)
  action!: CustodyAction;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;
}

export class CreateCustomsApplicationDto {
  @IsString()
  @MinLength(1)
  authority!: string;

  @IsOptional()
  @IsUUID()
  seizureId?: string;

  @IsOptional()
  @IsString()
  applicationNumber?: string;

  @IsOptional()
  @IsDateString()
  submittedDate?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsUUID()
  renewalOfId?: string;
}

export class UpdateCustomsApplicationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  authority?: string;

  @IsOptional()
  @IsUUID()
  seizureId?: string | null;

  @IsOptional()
  @IsString()
  applicationNumber?: string | null;

  @IsOptional()
  @IsDateString()
  submittedDate?: string | null;

  @IsOptional()
  @IsDateString()
  validFrom?: string | null;

  @IsOptional()
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsEnum(CustomsApplicationStatus)
  status?: CustomsApplicationStatus;
}
