import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class FileIpRightDto {
  @IsUUID()
  documentVersionId!: string;

  @IsDateString()
  filingDate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  applicationNumber!: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  jurisdiction?: string;
}
