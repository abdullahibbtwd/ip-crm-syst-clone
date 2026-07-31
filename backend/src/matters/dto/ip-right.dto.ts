import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IpRightStatus, MatterType } from '../../../generated/prisma/client';

export class CreateIpRightDto {
  @IsEnum(MatterType)
  rightType!: MatterType;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registrationNumber?: string;

  @IsOptional()
  @IsDateString()
  filingDate?: string;

  @IsOptional()
  @IsDateString()
  registrationDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsString()
  @Length(2, 2)
  jurisdiction!: string;

  @IsOptional()
  @IsEnum(IpRightStatus)
  status?: IpRightStatus;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, unknown>;

  /** Override owner; defaults to matter.applicantClientId ?? matter.clientId. */
  @IsOptional()
  @IsUUID()
  ownerClientId?: string;
}
