import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CorrespondenceDirection,
  CorrespondenceStatus,
  DocumentCategory,
} from '../../../generated/prisma/client';

export class CreateCorrespondenceDto {
  @IsEnum(CorrespondenceDirection)
  direction!: CorrespondenceDirection;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsDateString()
  correspondenceDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  sender!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  recipient!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  subject!: string;

  @IsEnum(CorrespondenceStatus)
  status!: CorrespondenceStatus;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;
}

export class UpdateCorrespondenceDto {
  @IsOptional()
  @IsEnum(CorrespondenceStatus)
  status?: CorrespondenceStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  subject?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string | null;
}
