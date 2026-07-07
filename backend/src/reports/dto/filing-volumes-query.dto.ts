import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { MatterType } from '../../../generated/prisma/client';

export class FilingVolumesQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(MatterType)
  matterType?: MatterType;

  @IsOptional()
  @IsString()
  jurisdiction?: string;
}
