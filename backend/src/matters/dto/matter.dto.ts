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
   * @deprecated Drafts are excluded by default; use draftsOnly or status=draft to list them.
   * Kept for API compatibility — has no effect when status / draftsOnly are unset.
   */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  excludeDrafts?: boolean;

  /** Trademark create-file subcategory (attributes.trademarkProcedure). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  trademarkProcedure?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trademarkApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trademarkName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trademarkIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trademarkRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  trademarkMarkType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  trademarkMarkKind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  trademarkTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trademarkRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  trademarkAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  trademarkAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  trademarkRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  trademarkRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  trademarkContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  trademarkStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  trademarkClass?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  trademarkCountry?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  trademarkCertificate?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  patentApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  patentName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  patentIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  patentRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patentTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  patentRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patentAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patentAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patentRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patentRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  patentContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  patentStage?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  patentCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  patentCertificate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  patentAnnualFees?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  designApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  designName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  designRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  designTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designProcedure?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  designRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  designContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  designStage?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  designCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  designCertificate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utilityModelApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utilityModelName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utilityModelIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  utilityModelRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  utilityModelTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utilityModelRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  utilityModelAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  utilityModelAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  utilityModelRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  utilityModelRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  utilityModelContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  utilityModelStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  utilityModelCertificate?: string;

  /** When true with matterType=patent, list only SPC files (attributes.spc / patentProcedure=spc). */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  spcOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spcApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spcName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spcIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  spcRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  spcTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spcRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  spcAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  spcAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  spcRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  spcRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spcContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  spcStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  spcCertificate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  giApplicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  giName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  giIncoming?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  giRegNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  giTerritory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  giRepresentative?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  giAppFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  giAppTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  giRegFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  giRegTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  giContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  giStage?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  giCountry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  giCertificate?: string;
}
