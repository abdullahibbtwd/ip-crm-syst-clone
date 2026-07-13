import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateApprovalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateApprovalDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @IsOptional()
  @IsUUID()
  documentVersionId?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;
}

export class DecideApprovalDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  note?: string;
}
