import { IsUUID } from 'class-validator';

export class GenerateDocumentDto {
  @IsUUID()
  templateId!: string;
}
