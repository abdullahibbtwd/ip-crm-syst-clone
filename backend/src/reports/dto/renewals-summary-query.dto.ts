import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RenewalsSummaryQueryDto {
  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsString()
  jurisdiction?: string;
}
