import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  CorrespondenceDirection,
  CorrespondenceSource,
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

  @IsOptional()
  @IsEnum(CorrespondenceStatus)
  status?: CorrespondenceStatus;

  @IsOptional()
  @IsEnum(CorrespondenceSource)
  source?: CorrespondenceSource;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  messageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500_000)
  bodyText?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;

  @IsOptional()
  @IsUUID()
  mailboxConnectionId?: string;

  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean;
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

  @IsOptional()
  @IsBoolean()
  isClientVisible?: boolean;
}
