import { IsIn, IsObject, IsOptional, IsUUID } from 'class-validator';

export class GenerateDocumentDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsIn(['pdf', 'docx'])
  format?: 'pdf' | 'docx';

  @IsOptional()
  @IsObject()
  fields?: Record<string, string>;
}
