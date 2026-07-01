import { Type } from 'class-transformer';
import {
  IsArray,
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

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
