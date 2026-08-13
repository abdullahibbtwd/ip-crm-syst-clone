import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  MatterJurisdictionStatus,
  MatterStatus,
  MatterType,
} from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export class MatterJurisdictionDto {
  @IsString()
  @Length(2, 2)
  countryCode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  localRefNumber?: string;

  @IsOptional()
  @IsEnum(MatterJurisdictionStatus)
  status?: MatterJurisdictionStatus;
}

export class CreateMatterDto {
  @IsUUID()
  clientId!: string;

  @IsOptional()
  @IsUUID()
  applicantClientId?: string;

  @IsOptional()
  @IsUUID()
  intermediaryClientId?: string;

  @IsEnum(MatterType)
  matterType!: MatterType;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsEnum(MatterStatus)
  status?: MatterStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatterJurisdictionDto)
  jurisdictions?: MatterJurisdictionDto[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class UpdateMatterDto {
  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsEnum(MatterStatus)
  status?: MatterStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @IsOptional()
  @IsUUID()
  applicantClientId?: string | null;

  @IsOptional()
  @IsUUID()
  intermediaryClientId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatterJurisdictionDto)
  jurisdictions?: MatterJurisdictionDto[];

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;
}

export class MatterQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsEnum(MatterStatus)
  status?: MatterStatus;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  /** Comma-separated or repeated query values; used for “Others” shelf. Ignored when matterType is set. */
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') return undefined
    if (Array.isArray(value)) {
      return value.flatMap((v) => String(v).split(',')).map((s) => s.trim()).filter(Boolean)
    }
    return String(value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  })
  @IsArray()
  @IsEnum(MatterType, { each: true })
  matterTypes?: MatterType[];

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  /** When true, list only archived working files. Default lists non-archived. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  archivedOnly?: boolean;

  /** When true, list only draft (non-archived) files. */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  draftsOnly?: boolean;

  /**
   * When true (and status / draftsOnly not set), hide drafts from active shelves.
   * Default active lists should pass this so drafts live only under Drafts.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeDrafts?: boolean;
}
