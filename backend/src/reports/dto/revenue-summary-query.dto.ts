import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class RevenueSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;
}
