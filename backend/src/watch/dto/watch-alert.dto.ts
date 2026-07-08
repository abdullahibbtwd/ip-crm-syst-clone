import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { WatchAlertStatus, WatchRegistrySource } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';
import { WATCH_CANONICAL_JURISDICTIONS } from '../watch.constants';

export class ListWatchAlertsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(WatchAlertStatus)
  status?: WatchAlertStatus;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @IsIn(WATCH_CANONICAL_JURISDICTIONS)
  jurisdiction?: string;

  @IsOptional()
  @IsEnum(WatchRegistrySource)
  source?: WatchRegistrySource;
}

export class CreateMockWatchAlertDto {
  @IsOptional()
  @IsUUID()
  watchProfileId?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  conflictingMark?: string;

  @IsOptional()
  @IsEnum(WatchRegistrySource)
  source?: WatchRegistrySource;

  @IsOptional()
  @IsString()
  @IsIn(WATCH_CANONICAL_JURISDICTIONS)
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  applicationNumber?: string;
}
