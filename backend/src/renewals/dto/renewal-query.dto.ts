import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { RenewalStatus } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../crm/dto/pagination.dto';

export class ListRenewalsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(RenewalStatus)
  status?: RenewalStatus;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  jurisdiction?: string;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;
}
