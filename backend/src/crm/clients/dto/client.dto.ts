import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ClientStatus, ClientType } from '../../../../generated/prisma/client';
import { PaginationQueryDto } from '../../dto/pagination.dto';

export class CreateClientDto {
  @IsEnum(ClientType)
  type!: ClientType;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @ValidateIf((o: CreateClientDto) => o.type === ClientType.company)
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsOptional()
  @IsString()
  vatNo?: string;

  @IsOptional()
  @IsString()
  legalForm?: string;

  @ValidateIf((o: CreateClientDto) => o.type === ClientType.individual)
  @IsString()
  firstName?: string;

  @ValidateIf((o: CreateClientDto) => o.type === ClientType.individual)
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsUUID()
  holdingGroupId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  gdprConsent?: boolean;
}

export class UpdateClientDto {
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  registrationNo?: string;

  @IsOptional()
  @IsString()
  vatNo?: string;

  @IsOptional()
  @IsString()
  legalForm?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string | null;

  @IsOptional()
  @IsUUID()
  holdingGroupId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  gdprConsent?: boolean;
}

export class ClientQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsEnum(ClientType)
  type?: ClientType;

  @IsOptional()
  @IsUUID()
  assignedUserId?: string;

  @IsOptional()
  @IsUUID()
  holdingGroupId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
