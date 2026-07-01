import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DocumentCategory } from '../../../generated/prisma/client';

export class UploadDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  displayName?: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tags?: string;
}

export class DocumentQueryDto {
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
