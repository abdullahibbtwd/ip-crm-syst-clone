import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../dto/pagination.dto';

export class CreateHoldingGroupDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateHoldingGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class HoldingGroupQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
