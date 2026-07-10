import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DocumentCategory } from '../../../generated/prisma/client';

export class CreateDocumentTemplateDto {
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase kebab-case (e.g. filing-cover-letter)',
  })
  slug!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  referenceLine?: string;

  @IsString()
  @MinLength(1)
  htmlBody!: string;
}

export class UpdateDocumentTemplateDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null)
  description?: string | null;

  @IsOptional()
  @IsString()
  @ValidateIf((_, v) => v !== null)
  referenceLine?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  htmlBody?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
