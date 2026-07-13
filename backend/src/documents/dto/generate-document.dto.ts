import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class GenerateDocumentDto {
  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsIn(['pdf', 'docx'])
  format?: 'pdf' | 'docx';
}
